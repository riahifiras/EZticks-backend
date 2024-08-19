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
        console.log("Event received:", event);

        const { id } = event.pathParameters;
        const updatedItem = JSON.parse(event.body);

        // Initialize dynamic variables
        const updateExpressionParts = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};

        // List of all attributes except 'id'
        const attributes = [
            'eventId', 'eventName', 'rate', 'issueDate', 
            'hostName', 'userId', 'ticketPrice', 'userName'
        ];

        // Build the UpdateExpression dynamically based on provided attributes
        attributes.forEach((attribute) => {
            if (updatedItem.hasOwnProperty(attribute) && updatedItem[attribute] !== undefined) {
                const attributeName = `#${attribute}`;
                const attributeValue = `:${attribute}`;
                updateExpressionParts.push(`${attributeName} = ${attributeValue}`);
                expressionAttributeNames[attributeName] = attribute;
                expressionAttributeValues[attributeValue] = 
                    attribute === 'ticketPrice'
                        ? parseFloat(updatedItem[attribute])
                        : updatedItem[attribute];
            }
        });

        if (updateExpressionParts.length === 0) {
            return {
                statusCode: 400,
                headers,
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
            body: JSON.stringify({ message: 'Ticket updated', attributes: data.Attributes })
        };
    } catch (error) {
        console.error('Error updating ticket:', error);

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
