const AWS = require('aws-sdk');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const dynamodb = new AWS.DynamoDB.DocumentClient();
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

    try {
        const item = JSON.parse(event.body);
        
        // Generate a unique ID for the ticket
        item.ticketId = uuidv4();

        // Store the ticket in DynamoDB
        const params = {
            TableName: tableName,
            Item: item
        };

        await dynamodb.put(params).promise();

        // Decrease the number of slots for the event by 1
        const eventId = item.eventId; // Assuming eventId is passed in the body
        const getEventUrl = `https://eea5ym4cdf.execute-api.us-east-1.amazonaws.com/dev/events/${eventId}`;

        // Fetch the current event data
        const eventResponse = await axios.get(getEventUrl);
        const currentSlots = eventResponse.data.slots;

        // Decrease the slots count by 1
        const updatedSlots = currentSlots - 1;
        const updateSlotsUrl = getEventUrl;
        const slotsData = { slots: updatedSlots };

        // Make the PUT request to update slots
        await axios.put(updateSlotsUrl, slotsData);

        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({ message: 'Ticket created and slots updated', item: item })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ error: 'Could not create ticket or update slots' })
        };
    }
};
