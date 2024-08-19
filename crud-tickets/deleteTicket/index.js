const AWS = require('aws-sdk');
const axios = require('axios');
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
        const { id } = event.pathParameters;

        const getTicketUrl = `https://zkyeza1yt2.execute-api.us-east-1.amazonaws.com/dev/tickets/${id}`;
        const ticketResponse = await axios.get(getTicketUrl);
        const eventId = ticketResponse.data.eventId;

        const getEventUrl = `https://eea5ym4cdf.execute-api.us-east-1.amazonaws.com/dev/events/${eventId}`;
        const eventResponse = await axios.get(getEventUrl);
        const currentSlots = eventResponse.data.slots;

        const updatedSlots = currentSlots + 1;
        const updateSlotsUrl = getEventUrl;
        const slotsData = { slots: updatedSlots };

        await axios.put(updateSlotsUrl, slotsData);

        const params = {
            TableName: tableName,
            Key: { id }
        };

        await dynamodb.delete(params).promise();

        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({ message: 'Ticket deleted and slots updated' })
        };
    } catch (error) {
        console.error('Error deleting ticket or updating slots:', error);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ error: 'Could not delete ticket or update slots' })
        };
    }
};
