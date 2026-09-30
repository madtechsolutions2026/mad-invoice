# API Specifications
## Bulk Invoice Automation Platform — MadTech Solutions

---

## 1. Authentication Endpoints

### Login
* **Method:** `POST`
* **Route:** `/api/auth/login`
* **Headers:** `x-tenant-id: <tenant_id>`
* **Request Body:**
  ```json
  {
    "email": "admin@madtech.com",
    "password": "Admin@123"
  }
  ```
* **Response:**
  ```json
  {
    "token": "JWT_TOKEN_HERE",
    "user": {
      "id": "user_id_uuid",
      "email": "admin@madtech.com",
      "firstName": "MadTech",
      "lastName": "Admin",
      "role": "ADMIN"
    }
  }
  ```

---

## 2. Spreadsheet Import Endpoints

### Upload File Headers Parsing
* **Method:** `POST`
* **Route:** `/api/imports/upload`
* **Body:** `Multipart Form Data (file: spreadsheet.xlsx)`
* **Response:**
  ```json
  {
    "fileName": "test.xlsx",
    "headers": ["InvNo", "Date", "Customer", "Amount", "GST"],
    "autoMapping": {
      "invoiceNumber": "InvNo",
      "invoiceDate": "Date",
      "customerName": "Customer"
    },
    "previewRows": [
      { "InvNo": "MTS-01", "Date": "2026-08-21", "Customer": "Client A", "Amount": 10000, "GST": 18 }
    ],
    "fileBase64": "BASE64_STRING..."
  }
  ```

### Validate Sheet Data
* **Method:** `POST`
* **Route:** `/api/imports/validate`
* **Request Body:**
  ```json
  {
    "fileBase64": "BASE64_STRING...",
    "fileName": "test.xlsx",
    "companyId": "company_uuid",
    "mapping": {
      "invoiceNumber": "InvNo",
      "invoiceDate": "Date",
      "customerName": "Customer",
      "customerAddress": "Address",
      "customerCity": "City",
      "customerState": "State",
      "customerStateCode": "StateCode",
      "customerPinCode": "PinCode",
      "hsnSac": "HSN",
      "description": "Item",
      "quantity": "Qty",
      "unit": "Unit",
      "rate": "Rate",
      "gstRate": "GST"
    }
  }
  ```
* **Response:**
  ```json
  {
    "batchId": "batch_uuid",
    "summary": {
      "totalRows": 1,
      "validRows": 1,
      "warningRows": 0,
      "errorRows": 0
    },
    "results": []
  }
  ```
