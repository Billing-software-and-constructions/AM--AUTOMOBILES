export interface Product {
    id: string;
    name: string;
    price: number;
    created_at?: string;
}

export interface Customer {
    id: string;
    name: string;
    phone: string;
    vehicle_number: string;
    vehicle_name: string;
    gst_number?: string;
    created_at?: string;
}

export interface Bill {
    id: string;
    invoice_no: number;
    customer_id: string;
    customer?: Customer;
    bill_date: string;
    total_amount: number;
    cgst_percentage?: number;
    sgst_percentage?: number;
    created_at?: string;
    items?: BillItem[];
}

export interface BillItem {
    id: string;
    bill_id: string;
    product_id: string;
    product?: Product;
    description: string;
    quantity: number;
    price: number;
    amount: number;
}
