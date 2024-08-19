const AWS = require('aws-sdk');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { PDFDocument, rgb, StandardFonts, degrees } = require('pdf-lib');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();
const tableName = 'ticket-dev-ezticks-tickets';

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: headers,
            body: ''
        };
    }

    if (!event.body) {
        return {
            statusCode: 400,
            headers: headers,
            body: JSON.stringify({ error: 'Request body is missing', details: 'event.body is undefined' })
        };
    }

    let item;
    try {
        item = JSON.parse(event.body);
    } catch (jsonError) {
        return {
            statusCode: 400,
            headers: headers,
            body: JSON.stringify({ error: 'Invalid JSON format', details: jsonError.message })
        };
    }

    const requiredFields = ['userName', 'userId', 'eventId', 'eventName', 'hostName', 'issueDate', 'rate', 'ticketPrice'];
    const missingFields = requiredFields.filter(field => !item.hasOwnProperty(field));

    if (missingFields.length > 0) {
        return {
            statusCode: 400,
            headers: headers,
            body: JSON.stringify({
                error: 'Missing required fields',
                details: `Missing fields: ${missingFields.join(', ')}`
            })
        };
    }

    try {
        const eventId = item.eventId;
        const getEventUrl = `https://eea5ym4cdf.execute-api.us-east-1.amazonaws.com/dev/events/${eventId}`;

        console.log(`Making GET request to ${getEventUrl}`);
        const eventResponse = await axios.get(getEventUrl);
        console.log('Event response:', eventResponse.data);

        const currentSlots = eventResponse.data.slots;
        const updatedSlots = currentSlots - 1;
        const slotsData = { slots: updatedSlots };

        console.log(`Making PUT request to ${getEventUrl} with data:`, slotsData);
        await axios.put(getEventUrl, slotsData);

        item.id = uuidv4();

        const params = {
            TableName: tableName,
            Item: item
        };
        await dynamodb.put(params).promise();

        const pdfUrl = await generateAndUploadPDF(item);

        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({ message: 'Ticket created, PDF generated and slots updated', item: item, pdfUrl: pdfUrl })
        };
    } catch (error) {
        console.error('Error details:', error);

        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({
                error: 'Could not create ticket or update slots',
                details: error.message,
                stack: error.stack
            })
        };
    }
};

const generateAndUploadPDF = async (item) => {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 200]); 
    const { width, height } = page.getSize();

    const logoUrl = 'https://static.vecteezy.com/system/resources/thumbnails/012/986/755/small/abstract-circle-logo-icon-free-png.png'; // Replace with your logo URL
    let logoImageBytes;
    try {
      const response = await axios.get(logoUrl, { responseType: 'arraybuffer' });
      logoImageBytes = response.data;
    } catch (fetchError) {
      console.error('Error fetching logo image:', fetchError);
      throw new Error('Failed to fetch logo image');
    }
    
    const logoImage = await pdfDoc.embedPng(logoImageBytes);

    const logoWidth = 120;
    const logoHeight = 120;
    page.drawImage(logoImage, {
      x: width - logoWidth - 20, 
      y: height / 2 - logoHeight / 2, 
      width: logoWidth,
      height: logoHeight,
      rotate: degrees(0),
    });

    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    };

    const formattedDate = formatDate(item.issueDate);

    page.drawText(item.eventName, {
      x: 20,
      y: height - 25,
      size: 18,
      color: rgb(0.2, 0.2, 0.2),
      font: font,
    });

    page.drawText(`Date: ${formattedDate}`, {
      x: 20,
      y: height - 50,
      size: 12,
      color: rgb(0.2, 0.2, 0.2),
      font: font,
    });

    page.drawText(`Host: ${item.hostName}`, {
      x: 20,
      y: height - 75,
      size: 12,
      color: rgb(0.2, 0.2, 0.2),
      font: font,
    });

    page.drawText(`Ticket Price: ${item.ticketPrice}DT`, {
      x: 20,
      y: height - 100,
      size: 12,
      color: rgb(0.2, 0.2, 0.2),
      font: font,
    });

    page.drawText(`Rate: ${item.rate}`, {
      x: 20,
      y: height - 125,
      size: 12,
      color: rgb(0.2, 0.2, 0.2),
      font: font,
    });

    page.drawText(`User: ${item.userName} (${item.userId})`, {
      x: 20,
      y: height - 150,
      size: 12,
      color: rgb(0.2, 0.2, 0.2),
      font: font,
    });

    page.drawText(`Ticket ID: ${item.id}`, {
      x: 20,
      y: 30,
      size: 16,
      color: rgb(0.5, 0.5, 0.5),
      font: font,
    });

    const pdfBytes = await pdfDoc.save();

    const bucketName = 'ticket-dev-yesss';
    const objectKey = `pdfs/ticket-${item.id}.pdf`;

    await s3.putObject({
      Bucket: bucketName,
      Key: objectKey,
      Body: pdfBytes,
      ContentType: 'application/pdf',
    }).promise();

    const pdfUrl = `https://${bucketName}.s3.amazonaws.com/${objectKey}`;
    return pdfUrl;
  } catch (error) {
    console.error('Error generating or uploading PDF:', error);
    throw new Error('Failed to generate or upload PDF.');
  }
};
