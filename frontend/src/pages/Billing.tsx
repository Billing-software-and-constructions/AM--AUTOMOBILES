import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { BillItem } from '../types';
import { Plus, Trash2, Save, Printer, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';

const numberToWords = (num: number): string => {
    const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    if ((num = num.toString().length > 9 ? parseFloat(num.toString().substring(0, 9)) : num) === 0) return ''; // Overflow limit
    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += (parseInt(n[1]) !== 0) ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'crore ' : '';
    str += (parseInt(n[2]) !== 0) ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'lakh ' : '';
    str += (parseInt(n[3]) !== 0) ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'thousand ' : '';
    str += (parseInt(n[4]) !== 0) ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'hundred ' : '';
    str += (parseInt(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) : '';
    return str.trim();
};

export default function Billing() {
    const [loading, setLoading] = useState(false);

    // Bill State
    const [billingType, setBillingType] = useState<'product' | 'labour'>('product');
    const [labourName, setLabourName] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [vehicleName, setVehicleName] = useState('');
    const [vehicleKm, setVehicleKm] = useState('');
    const [customerGst, setCustomerGst] = useState('');
    const [billItems, setBillItems] = useState<BillItem[]>([]);

    // New Item Entry State
    const [newItemDescription, setNewItemDescription] = useState('');
    const [newItemQuantity, setNewItemQuantity] = useState<number | ''>(1);
    const [newItemPrice, setNewItemPrice] = useState<number | ''>('');

    // Tax State
    const [cgstPercentage, setCgstPercentage] = useState(9);
    const [sgstPercentage, setSgstPercentage] = useState(9);
    const [withGst, setWithGst] = useState(true);

    // Price Mode State
    const [priceMode, setPriceMode] = useState<'per_unit' | 'total'>('per_unit');

    // Print State
    const [generatedBill, setGeneratedBill] = useState<any | null>(null);

    // Auto-trigger print when bill is generated
    useEffect(() => {
        if (generatedBill) {
            setTimeout(() => {
                window.print();
            }, 500);
        }
    }, [generatedBill]);

    // Add item manually
    const addManualItem = () => {
        // Validation: For Labour, only description is needed. For Product, price is also needed.
        if (!newItemDescription.trim()) {
            alert('Please enter item description.');
            return;
        }
        if ((!newItemPrice || newItemPrice <= 0)) {
            alert('Please enter a valid price/amount.');
            return;
        }

        const qty = billingType === 'labour' ? 1 : (newItemQuantity || 1);
        const enteredPrice = Number(newItemPrice);
        const unitPrice = priceMode === 'total' ? enteredPrice / qty : enteredPrice;
        const totalAmount = priceMode === 'total' ? enteredPrice : qty * enteredPrice;

        const newItem: BillItem = {
            id: Math.random().toString(36).substr(2, 9),
            bill_id: '',
            product_id: null,
            description: newItemDescription.trim(),
            quantity: qty,
            price: unitPrice,
            amount: totalAmount
        };

        setBillItems([...billItems, newItem]);
        // Reset form
        setNewItemDescription('');
        setNewItemQuantity(1);
        setNewItemPrice('');
    };

    const updateQuantity = (id: string, newQuantity: number | '') => {
        setBillItems(billItems.map(item =>
            item.id === id
                ? {
                    ...item,
                    quantity: newQuantity === '' ? '' : newQuantity,
                    amount: (newQuantity || 1) * item.price
                }
                : item
        ));
    };

    const finalizeQuantity = (id: string) => {
        setBillItems(billItems.map(item =>
            item.id === id && (item.quantity === '' || item.quantity < 1)
                ? { ...item, quantity: 1, amount: item.price }
                : item
        ));
    };

    const removeFromBill = (id: string) => {
        setBillItems(billItems.filter(item => item.id !== id));
    };

    const calculateTotal = () => {
        return billItems.reduce((sum, item) => sum + item.amount, 0);
    };

    const handleSaveBill = async () => {
        if (!customerName || billItems.length === 0) {
            alert('Please enter customer name and add items.');
            return;
        }

        if (billingType === 'labour' && !labourName) {
            alert('Please enter labour name.');
            return;
        }

        setLoading(true);
        try {
            // 1. Create Customer
            const { data: customerData, error: customerError } = await supabase
                .from('customers')
                .insert([{
                    name: customerName,
                    phone: customerPhone,
                    vehicle_number: vehicleNumber,
                    vehicle_name: vehicleName,
                    vehicle_km: vehicleKm,
                    gst_number: customerGst
                }])
                .select()
                .single();

            if (customerError) throw customerError;

            // 2. Create Bill
            // For Labour billing, we save 0 as total implicitly since items have 0 price
            const { data: billData, error: billError } = await supabase
                .from('bills')
                .insert([{
                    customer_id: customerData.id,
                    total_amount: calculateTotal(),
                    bill_date: new Date().toISOString(),
                    cgst_percentage: (withGst && billingType === 'product') ? cgstPercentage : 0,
                    sgst_percentage: (withGst && billingType === 'product') ? sgstPercentage : 0
                }])
                .select()
                .single();

            if (billError) throw billError;

            // 3. Create Bill Items (product_id can be null now)
            const itemsToInsert = billItems.map(item => ({
                bill_id: billData.id,
                product_id: item.product_id || null,
                description: item.description,
                quantity: item.quantity,
                price: item.price
            }));

            const { error: itemsError } = await supabase
                .from('bill_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            // SUCCESS: Set generated bill to trigger print view
            setGeneratedBill({
                invoice_no: billData.invoice_no,
                bill_date: billData.bill_date,
                customer: {
                    name: customerName,
                    phone: customerPhone,
                    vehicle_number: vehicleNumber,
                    vehicle_name: vehicleName,
                    vehicle_km: vehicleKm,
                    gst_number: customerGst
                },
                items: billItems,
                total: calculateTotal(),
                cgstPercentage: (withGst && billingType === 'product') ? cgstPercentage : 0,
                sgstPercentage: (withGst && billingType === 'product') ? sgstPercentage : 0,
                withGst: (withGst && billingType === 'product'),
                billingType,
                labourName
            });

        } catch (error) {
            console.error('Error saving bill:', error);
            // Demo Fallback
            if (localStorage.getItem('demo_session')) {
                const demoBills = JSON.parse(localStorage.getItem('demo_bills') || '[]');
                const newBillId = 0 + demoBills.length + 1;
                const newBill = {
                    id: Date.now().toString(),
                    invoice_no: newBillId,
                    customer: { name: customerName, phone: customerPhone, vehicle_number: vehicleNumber, vehicle_name: vehicleName, vehicle_km: vehicleKm, gst_number: customerGst },
                    bill_date: new Date().toISOString(),
                    total_amount: calculateTotal(),
                    items: billItems,
                    cgst_percentage: (withGst && billingType === 'product') ? cgstPercentage : 0,
                    sgst_percentage: (withGst && billingType === 'product') ? sgstPercentage : 0
                };
                localStorage.setItem('demo_bills', JSON.stringify([newBill, ...demoBills]));

                // Trigger Print View instead of alert
                setGeneratedBill({
                    invoice_no: newBillId,
                    bill_date: new Date().toISOString(),
                    customer: { name: customerName, phone: customerPhone, vehicle_number: vehicleNumber, vehicle_name: vehicleName, vehicle_km: vehicleKm, gst_number: customerGst },
                    items: billItems,
                    total: calculateTotal(),
                    cgstPercentage: (withGst && billingType === 'product') ? cgstPercentage : 0,
                    sgstPercentage: (withGst && billingType === 'product') ? sgstPercentage : 0,
                    withGst: (withGst && billingType === 'product'),
                    billingType,
                    labourName
                });
            } else {
                alert('Failed to save bill. Check connection.');
            }
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setCustomerName('');
        setCustomerPhone('');
        setVehicleNumber('');
        setVehicleName('');
        setVehicleKm('');
        setCustomerGst('');
        setBillItems([]);
        setCgstPercentage(9);
        setSgstPercentage(9);
        setWithGst(true);
        setPriceMode('per_unit');
        setNewItemDescription('');
        setNewItemQuantity(1);
        setNewItemPrice('');
        setLabourName('');
        setGeneratedBill(null); // Close print view
    };


    // PRINT VIEW RENDER
    if (generatedBill) {
        // Calculate grand total for words
        const grandTotal = generatedBill.withGst
            ? Math.round(generatedBill.total * (1 + (generatedBill.cgstPercentage + generatedBill.sgstPercentage) / 100))
            : Math.round(generatedBill.total);
        const amountInWords = numberToWords(grandTotal);

        return (
            <div className="fixed inset-0 z-50 bg-white overflow-auto flex flex-col">
                {/* Print Handling: Hide these Controls when printing */}
                <div className="print:hidden p-4 bg-slate-800 text-white flex justify-between items-center shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-500 rounded-full p-1"><Save size={16} /></div>
                        <span className="font-medium">Bill Saved Successfully!</span>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => window.print()}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                        >
                            <Printer size={18} /> Print Again
                        </button>
                        <button
                            onClick={resetForm}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                        >
                            <X size={18} /> Close & New Bill
                        </button>
                    </div>
                </div>

                {/* INVOICE CONTENT */}
                <div className="flex-1 p-4 max-w-4xl mx-auto w-full bg-white text-slate-900">
                    {/* Header */}
                    <div className="border-b-2 border-slate-800 pb-2 mb-3">
                        {/* Top Row: Logo + Company Info + GSTIN/Email */}
                        <div className="flex items-start gap-4 mb-2">
                            {/* Logo - Left */}
                            <img src="/maruti-logo.png" alt="Maruti Logo" className="h-14" />

                            {/* Center - Company Name & Details */}
                            <div className="flex-1 text-center text-[#1e3a8a]">
                                <h1 className="text-2xl font-black tracking-wide" style={{ fontFamily: 'Times New Roman, serif' }}>A.M. AUTO MOBILES</h1>
                                <h2 className="text-xs font-bold tracking-wider">ALL CARS SERVICE CENTRE & CAR GAS CONSULTANT, WATTER SERVICE & WHEEL ALIGNMENT</h2>
                                <p className="text-xs font-bold mt-0.5">168/48, Chitra Nagar, Opposite Vijay Hero, KUTTHUKKALVALASAI - 627 803</p>
                                <p className="text-xs font-bold">Cell : 98421 96875, 98659 79825</p>
                            </div>

                            {/* Right - GSTIN/Email */}
                            <div className="text-right text-xs font-bold text-slate-800">
                                <div>GSTIN: 33BEUPA7334G1ZI</div>
                                <div>amautomobiles111@gmail.com</div>
                            </div>
                        </div>

                        {/* Invoice Details Line */}
                        <div className="flex justify-between items-center pt-1 border-t border-slate-300 text-sm">
                            <div>
                                Invoice No: <span className="font-bold text-slate-800">AM_{generatedBill.invoice_no.toString().padStart(2, '0')}</span>
                            </div>
                            <div>
                                Date: <span className="font-bold text-slate-800">{format(new Date(generatedBill.bill_date), 'dd MMM yyyy')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Customer & Vehicle Details - Two Columns */}
                    <div className="mb-3 text-sm">
                        <div className="flex gap-8">
                            {/* Left Column: Customer Details */}
                            <div className="flex-1 space-y-1">
                                <div>
                                    <span className="font-bold text-slate-600 uppercase text-xs">Customer:</span>
                                    <span className="font-bold text-slate-900 ml-1">{generatedBill.customer.name}</span>
                                </div>
                                <div>
                                    <span className="font-bold text-slate-600 uppercase text-xs">Phone:</span>
                                    <span className="font-medium text-slate-900 ml-1">{generatedBill.customer.phone}</span>
                                </div>
                                {generatedBill.customer.gst_number && (
                                    <div>
                                        <span className="font-bold text-slate-600 uppercase text-xs">Customer GST:</span>
                                        <span className="font-bold text-slate-900 ml-1 uppercase">{generatedBill.customer.gst_number}</span>
                                    </div>
                                )}
                            </div>

                            {/* Right Column: Vehicle Details */}
                            <div className="flex-1 space-y-1">
                                <div>
                                    <span className="font-bold text-slate-600 uppercase text-xs">Vehicle No:</span>
                                    <span className="font-bold text-slate-900 ml-1 uppercase">{generatedBill.customer.vehicle_number || '-'}</span>
                                </div>
                                <div>
                                    <span className="font-bold text-slate-600 uppercase text-xs">Vehicle Name:</span>
                                    <span className="font-medium text-slate-900 ml-1">{generatedBill.customer.vehicle_name || '-'}</span>
                                </div>
                                <div>
                                    <span className="font-bold text-slate-600 uppercase text-xs">Kilometre:</span>
                                    <span className="font-medium text-slate-900 ml-1">{generatedBill.customer.vehicle_km || '-'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Labour Details (Only if present) */}
                    {generatedBill.billingType === 'labour' && generatedBill.labourName && (
                        <div className="mb-3 text-sm border-t border-slate-300 pt-2">
                            <div>
                                <span className="font-bold text-slate-600 uppercase text-xs">Labour Name:</span>
                                <span className="font-bold text-slate-900 ml-1 uppercase">{generatedBill.labourName}</span>
                            </div>
                        </div>
                    )}

                    {/* Table - Compact */}
                    <div className="mb-4">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-slate-300">
                                <tr>
                                    <th className="py-1.5 font-bold text-slate-700 w-10">#</th>
                                    <th className="py-1.5 font-bold text-slate-700">Item Description</th>
                                    {generatedBill.billingType === 'labour' ? (
                                        <th className="py-1.5 font-bold text-slate-700 text-right w-24">Amount</th>
                                    ) : (
                                        <>
                                            <th className="py-1.5 font-bold text-slate-700 text-right w-24">Price</th>
                                            <th className="py-1.5 font-bold text-slate-700 text-center w-16">Qty</th>
                                            <th className="py-1.5 font-bold text-slate-700 text-right w-24">Total</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {generatedBill.items.map((item: BillItem, index: number) => (
                                    <tr key={index}>
                                        <td className="py-1.5 text-slate-500">{index + 1}</td>
                                        <td className="py-1.5 font-medium">{item.description}</td>
                                        {generatedBill.billingType === 'labour' ? (
                                            <td className="py-1.5 text-right font-bold">₹{item.amount.toLocaleString('en-IN')}</td>
                                        ) : (
                                            <>
                                                <td className="py-1.5 text-right text-slate-600">₹{item.price}</td>
                                                <td className="py-1.5 text-center text-slate-600">{item.quantity}</td>
                                                <td className="py-1.5 text-right font-bold">₹{item.amount.toLocaleString('en-IN')}</td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals - Compact */}
                    {(

                        <div className="flex justify-end border-t border-slate-800 pt-3">
                            <div className="w-64 space-y-1 text-sm">
                                <div className="flex justify-between text-slate-600">
                                    <span>Subtotal</span>
                                    <span>₹{generatedBill.total.toLocaleString('en-IN')}</span>
                                </div>
                                {generatedBill.withGst && (
                                    <>
                                        <div className="flex justify-between text-slate-600">
                                            <span>CGST ({generatedBill.cgstPercentage}%)</span>
                                            <span>₹{(generatedBill.total * (generatedBill.cgstPercentage / 100)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-600">
                                            <span>SGST ({generatedBill.sgstPercentage}%)</span>
                                            <span>₹{(generatedBill.total * (generatedBill.sgstPercentage / 100)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                        </div>
                                    </>
                                )}
                                <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-2">
                                    <span>Grand Total</span>
                                    <span>₹{grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                </div>
                                {/* Amount in Words */}
                                <div className="pt-2 text-sm text-slate-700 text-right capitalize font-medium border-t border-slate-200 mt-2">
                                    {amountInWords} rupees only
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Footer - Compact */}
                    <div className="mt-6 text-center text-xs text-slate-400 border-t border-slate-100 pt-4">
                        <p>Thank you for your business!</p>
                        <p className="mt-0.5">This bill was generated by computer machine powered by Techverse Infotech.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[calc(100vh-100px)] print:hidden">
            {/* Left Panel: Add Item Form */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-200">
                    <h2 className="font-semibold text-slate-800 mb-4">Add Item</h2>

                    <div className="space-y-4">
                        {/* Billing Type Toggle */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                Billing Type
                            </label>
                            <div className="flex rounded-lg overflow-hidden border border-slate-300">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setBillingType('product');
                                        setBillItems([]); // Clear items on switch to avoid confusion
                                    }}
                                    className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${billingType === 'product'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    Product/Parts
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setBillingType('labour');
                                        setBillItems([]); // Clear items on switch
                                    }}
                                    className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${billingType === 'labour'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    Labour Bill
                                </button>
                            </div>
                        </div>


                        {/* Item Description */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                Item Description
                            </label>
                            <input
                                type="text"
                                value={newItemDescription}
                                onChange={(e) => setNewItemDescription(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder={billingType === 'product' ? "e.g. Oil Filter Service" : "e.g. Engine Checkup"}
                            />
                        </div>

                        {/* Quantity (Hidden for Labour) */}
                        {billingType === 'product' && (
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                    Quantity
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={newItemQuantity}
                                    onChange={(e) => setNewItemQuantity(e.target.value === '' ? '' : parseInt(e.target.value) || 1)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        )}

                        {/* Price Mode Toggle (Hidden for Labour) */}
                        {billingType === 'product' && (
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                    Price Mode
                                </label>
                                <div className="flex rounded-lg overflow-hidden border border-slate-300">
                                    <button
                                        type="button"
                                        onClick={() => setPriceMode('per_unit')}
                                        className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${priceMode === 'per_unit'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-white text-slate-600 hover:bg-slate-50'
                                            }`}
                                    >
                                        Per Unit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPriceMode('total')}
                                        className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${priceMode === 'total'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-white text-slate-600 hover:bg-slate-50'
                                            }`}
                                    >
                                        Total Amount
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Price/Amount */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                {billingType === 'labour' ? 'Amount (₹)' : (priceMode === 'per_unit' ? 'Price (₹ per unit)' : 'Total Amount (₹)')}
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={newItemPrice}
                                onChange={(e) => setNewItemPrice(e.target.value ? parseFloat(e.target.value) : '')}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="0.00"
                            />
                        </div>

                        {/* Add Button */}
                        <button
                            onClick={addManualItem}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-3 rounded-lg transition-colors shadow-lg shadow-blue-500/20"
                        >
                            <Plus size={20} />
                            Add Item to Bill
                        </button>
                    </div>
                </div>

                {/* Quick Info */}
                <div className="flex-1 p-4 bg-slate-50/50">
                    <div className="text-sm text-slate-500">
                        <p className="font-medium text-slate-600 mb-2">Quick Tips:</p>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                            {billingType === 'product' ? (
                                <>
                                    <li>Enter item description clearly</li>
                                    <li>Set quantity for multiple units</li>
                                    <li><b>Per Unit</b>: Enter price per item, Total = Qty × Price</li>
                                    <li><b>Total Amount</b>: Enter total for all units</li>
                                </>
                            ) : (
                                <>
                                    <li>Enter labour descriptions only</li>
                                    <li><b>Labour Name</b> is required</li>
                                    <li>Enter <b>Amount</b> for each labour item</li>
                                </>
                            )}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Right Panel: Bill Details */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                {/* ... (previous code remains same) ... */}
                <div className="p-6 border-b border-slate-200 bg-slate-50/50">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">
                                {billingType === 'product' ? 'New Invoice' : 'New Labour Bill'}
                            </h1>
                            <p className="text-slate-500">{format(new Date(), 'PPP')}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-slate-500">Invoice No</div>
                            <div className="font-mono font-bold text-lg text-slate-700">AM_XX</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Left Column: Customer Details */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200 pb-2">Customer Details</h3>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Customer Name</label>
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Enter Name"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
                                <input
                                    type="tel"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Enter Phone"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Customer GST (Optional)</label>
                                <input
                                    type="text"
                                    value={customerGst}
                                    onChange={(e) => setCustomerGst(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                                    placeholder="GSTIN"
                                />
                            </div>

                            {/* Labour Name Input (Conditiona) */}
                            {billingType === 'labour' && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 text-blue-600">
                                        Labour Name
                                    </label>
                                    <input
                                        type="text"
                                        value={labourName}
                                        onChange={(e) => setLabourName(e.target.value)}
                                        className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Enter Labour Name"
                                    />
                                </div>
                            )}

                        </div>

                        {/* Right Column: Vehicle Details */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200 pb-2">Vehicle Details</h3>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Vehicle Number</label>
                                <input
                                    type="text"
                                    value={vehicleNumber}
                                    onChange={(e) => setVehicleNumber(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                                    placeholder="TN 00 AA 0000"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Vehicle Name</label>
                                <input
                                    type="text"
                                    value={vehicleName}
                                    onChange={(e) => setVehicleName(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. Swift Dzire"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Kilometre</label>
                                <input
                                    type="text"
                                    value={vehicleKm}
                                    onChange={(e) => setVehicleKm(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. 25000"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bill Settings — GST Toggle (Hidden for Labour) */}
                {billingType === 'product' && (
                    <div className="px-6 pb-4 bg-slate-50/50 border-b border-slate-200">
                        {/* GST Toggle */}
                        <div className="mb-3">
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">GST Option</label>
                            <div className="flex rounded-lg overflow-hidden border border-slate-300 w-fit">
                                <button
                                    type="button"
                                    onClick={() => setWithGst(true)}
                                    className={`px-4 py-2 text-sm font-medium transition-colors ${withGst
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    With GST
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setWithGst(false)}
                                    className={`px-4 py-2 text-sm font-medium transition-colors ${!withGst
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    Without GST
                                </button>
                            </div>
                        </div>

                        {/* CGST / SGST inputs — only visible when withGst */}
                        {withGst && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">CGST %</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={cgstPercentage}
                                        onChange={(e) => setCgstPercentage(parseFloat(e.target.value) || 0)}
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">SGST %</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={sgstPercentage}
                                        onChange={(e) => setSgstPercentage(parseFloat(e.target.value) || 0)}
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Bill Items Table */}
                <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3 font-semibold text-slate-600 text-sm">Item</th>
                                {billingType === 'product' && (
                                    <>
                                        <th className="px-6 py-3 font-semibold text-slate-600 text-sm w-32">Price</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600 text-sm w-32">Qty</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600 text-sm w-32 text-right">Amount</th>
                                    </>
                                )}
                                <th className="px-6 py-3 font-semibold text-slate-600 text-sm w-16"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {billItems.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                                        No items added. Use the form on the left to add items.
                                    </td>
                                </tr>
                            ) : (
                                billItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/80">
                                        <td className="px-6 py-4 font-medium text-slate-900">{item.description}</td>
                                        {billingType === 'product' ? (
                                            <>
                                                <td className="px-6 py-4 text-slate-600">₹{item.price}</td>
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => updateQuantity(item.id, e.target.value === '' ? '' : parseInt(e.target.value) || 1)}
                                                        onBlur={() => finalizeQuantity(item.id)}
                                                        className="w-20 px-2 py-1 border border-slate-300 rounded-md text-center focus:ring-2 focus:ring-blue-500 outline-none"
                                                    />
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium text-slate-900">₹{item.amount.toLocaleString('en-IN')}</td>
                                            </>
                                        ) : (
                                            <>
                                                {/* For Labour: Empty Price/Qty cols to keep alignment, or just Amount */}
                                                <td className="px-6 py-4 text-slate-600"></td>
                                                <td className="px-6 py-4"></td>
                                                <td className="px-6 py-4 text-right font-medium text-slate-900">₹{item.amount.toLocaleString('en-IN')}</td>
                                            </>
                                        )}
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => removeFromBill(item.id)}
                                                className="text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer / Totals */}
                <div className="p-6 border-t border-slate-200 bg-slate-50">
                    <div className="flex justify-end gap-8 mb-6">
                        {billingType === 'product' && (
                            <>
                                <div className="text-right">
                                    <span className="text-sm text-slate-500 block">Subtotal</span>
                                    <span className="font-medium text-lg">₹{calculateTotal().toLocaleString('en-IN')}</span>
                                </div>
                                {withGst && (
                                    <>
                                        <div className="text-right">
                                            <span className="text-sm text-slate-500 block">CGST ({cgstPercentage}%)</span>
                                            <span className="font-medium text-lg">₹{(calculateTotal() * (cgstPercentage / 100)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm text-slate-500 block">SGST ({sgstPercentage}%)</span>
                                            <span className="font-medium text-lg">₹{(calculateTotal() * (sgstPercentage / 100)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                        </div>
                                    </>
                                )}
                                <div className="text-right">
                                    <span className="text-sm text-slate-500 block">Grand Total</span>
                                    <span className="font-bold text-2xl text-blue-600">
                                        ₹{(withGst
                                            ? calculateTotal() * (1 + (cgstPercentage + sgstPercentage) / 100)
                                            : calculateTotal()
                                        ).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </>
                        )}

                        {billingType === 'labour' && (
                            <div className="text-right">
                                <span className="text-sm text-slate-500 block">Total Amount</span>
                                <span className="font-bold text-2xl text-blue-600">
                                    ₹{calculateTotal().toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={resetForm}
                            className="px-6 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-white transition-colors"
                        >
                            Reset
                        </button>
                        <button
                            onClick={handleSaveBill}
                            disabled={loading || billItems.length === 0}
                            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                        >
                            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <Save size={20} />}
                            Generate Bill
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
