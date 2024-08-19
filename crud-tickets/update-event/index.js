const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const tableName = 'ticket-dev-ezticks-events';

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
        console.log("Event received:", event);

        const { id } = event.pathParameters;
        const updatedItem = JSON.parse(event.body);

        const updateExpressionParts = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};


        const attributes = [
            'title', 'description', 'datetime', 'slots', 'ticketprice', 
            'discount', 'tags', 'location', 'links', 'duration', 'hostName', 'pic'
        ];

        attributes.forEach((attribute) => {
            if (updatedItem.hasOwnProperty(attribute)) {
                const attributeName = `#${attribute}`;
                const attributeValue = `:${attribute}`;
                updateExpressionParts.push(`${attributeName} = ${attributeValue}`);
                expressionAttributeNames[attributeName] = attribute;
                expressionAttributeValues[attributeValue] = 
                    attribute === 'slots'
                        ? parseInt(updatedItem[attribute], 10)
                        : attribute === 'ticketprice' || attribute === 'discount'
                            ? parseFloat(updatedItem[attribute])
                            : updatedItem[attribute];
            }
        });

        if (updateExpressionParts.length === 0) {
            return {
                statusCode: 400,
                header,
                body: JSON.stringify({ error: 'No valid attributes to update' })
            };
        }

        const params = {
            TableName: tableName,
            Key: { id: id },
            UpdateExpression: `set ${updateExpressionParts.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'UPDATED_NEW'
        };

        console.log("Update parameters:", params);

        const data = await dynamodb.update(params).promise();

        console.log("Update successful:", data);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'Event updated', attributes: data.Attributes })
        };
    } catch (error) {
        console.error('Error updating event:', error);

        let errorMessage = 'An unknown error occurred.';
        if (error instanceof SyntaxError) {
            errorMessage = 'Invalid JSON format in the request body.';
        } else if (error.code === 'ConditionalCheckFailedException') {
            errorMessage = 'Conditional check failed. The item was not updated.';
        } else if (error.code === 'ValidationException') {
            errorMessage = 'Validation error. Please check your input values.';
        } else if (error.code === 'ResourceNotFoundException') {
            errorMessage = 'Resource not found. The specified table or item does not exist.';
        } else if (error.code === 'ProvisionedThroughputExceededException') {
            errorMessage = 'Provisioned throughput exceeded. Please try again later.';
        } else if (error.code === 'TransactionConflict') {
            errorMessage = 'Transaction conflict. Please retry your request.';
        }

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: errorMessage, details: error.message })
        };
    }
};
