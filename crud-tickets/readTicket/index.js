const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const tableName = 'tickets';

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
        const params = {
            TableName: tableName,
            Key: { ticketId }
        };

        const result = await dynamodb.get(params).promise();

        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify(result.Item)
        };
    } catch (error) {
        console.error('Error reading ticket:', error);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ error: 'Could not read ticket' })
        };
    }
};
