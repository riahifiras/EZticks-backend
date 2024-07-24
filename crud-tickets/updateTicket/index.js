const AWS = require('aws-sdk');
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
        const { ticketId } = event.pathParameters;
        const updateData = JSON.parse(event.body);
        const params = {
            TableName: tableName,
            Key: { ticketId },
            UpdateExpression: 'set #name = :name, #description = :description, #status = :status',
            ExpressionAttributeNames: {
                '#name': 'name',
                '#description': 'description',
                '#status': 'status'
            },
            ExpressionAttributeValues: {
                ':name': updateData.name,
                ':description': updateData.description,
                ':status': updateData.status
            },
            ReturnValues: 'UPDATED_NEW'
        };

        const result = await dynamodb.update(params).promise();

        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({ message: 'Ticket updated', updatedAttributes: result.Attributes })
        };
    } catch (error) {
        console.error('Error updating ticket:', error);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ error: 'Could not update ticket' })
        };
    }
};
