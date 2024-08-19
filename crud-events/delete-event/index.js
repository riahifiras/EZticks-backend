const AWS = require('aws-sdk');
const axios = require('axios');

const dynamodb = new AWS.DynamoDB.DocumentClient();

const EVENTS_TABLE = 'ticket-dev-ezticks-events';
const TICKETS_ENDPOINT = 'https://zkyeza1yt2.execute-api.us-east-1.amazonaws.com/dev/tickets'; 

exports.handler = async (event) => {
    const eventId = event.pathParameters.id; 

    if (!eventId) {
        return {
            statusCode: 400,
            body: JSON.stringify('Missing eventId in path parameters.')
        };
    }

    let tickets;
    try {
        const response = await axios.get(TICKETS_ENDPOINT);
        tickets = response.data; 
    } catch (err) {
        console.error('Failed to retrieve tickets:', err);
        return {
            statusCode: 500,
            body: JSON.stringify(`Failed to retrieve tickets: ${err.message}`)
        };
    }

    const ticketsToDelete = tickets.filter(ticket => ticket.eventId === eventId);

    try {
        const deleteRequests = ticketsToDelete.map(ticket =>
            axios.delete(`${TICKETS_ENDPOINT}/${ticket.id}`) 
        );
        await Promise.all(deleteRequests);
    } catch (err) {
        console.error('Failed to delete tickets:', err);
        return {
            statusCode: 500,
            body: JSON.stringify(`Failed to delete tickets: ${err.message}`)
        };
    }

    try {
        await dynamodb.delete({
            TableName: EVENTS_TABLE,
            Key: { id: eventId }
        }).promise();
    } catch (err) {
        console.error('Failed to delete event:', err);
        return {
            statusCode: 500,
            body: JSON.stringify(`Failed to delete event: ${err.message}`)
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify('Event and associated tickets deleted successfully.')
    };
};
