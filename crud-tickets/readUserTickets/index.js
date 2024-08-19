const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    const userId = event.queryStringParameters && event.queryStringParameters.userId;
    const tableName = 'ticket-dev-ezticks-tickets';
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    if (!userId) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing userId query parameter' }),
        };
    }

    const params = {
        TableName: tableName,
        FilterExpression: 'userId = :userId',
        ExpressionAttributeValues: {
            ':userId': userId,
        }
    };

    try {
        const data = await dynamoDB.scan(params).promise(); 
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data.Items),
        };
    } catch (error) {
        console.error('Error fetching data:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Could not fetch data' }),
        };
    }
};
