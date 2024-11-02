
# EZticks Backend

This repository contains a set of AWS Lambda functions written in Node.js to serve as the backend for a ticket-selling website. The functions handle essential operations such as managing ticket listings, ticket PDF generation, event management, and more.

## Functions Overview

### 1. Ticket Management
- **`createTicket`**: Creates a new ticket listing.
- **`updateTicket`**: Updates an existing ticket's information.
- **`deleteTicket`**: Deletes a ticket listing.
- **`readTicket`**: Reads a ticket listing.
- **`readTickets`**: Reads all ticket listings.
- **`genPDF`**: Generates a PDF file containing relevant ticket information.


### 2. User Reservations
- **`updateEvent`**: Updates an event.
- **`deleteEvent`**: Deletes an event.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
