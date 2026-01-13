
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Bill } from '../types';
import { Search, Eye, Printer, Loader2, Calendar, X } from 'lucide-react';
import { format } from 'date-fns';

export default function BillHistory() {
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBill, setSelectedBill] = useState<any | null>(null);
    const [viewMode, setViewMode] = useState<'view' | 'print' | null>(null);
    const [loadingBill, setLoadingBill] = useState(false);

    useEffect(() => {
        fetchBills();
    }, []);

    // Auto-trigger print when in print mode
    useEffect(() => {
        if (viewMode === 'print' && selectedBill) {
            setTimeout(() => {
                window.print();
            }, 500);
        }
    }, [viewMode, selectedBill]);

    const fetchBills = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('bills')
                .select(`
                    *,
                    customer:customers(name, phone, vehicle_number, vehicle_name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBills(data || []);
        } catch (error) {
            console.error('Error fetching bills:', error);
            // Demo fallback
            if (localStorage.getItem('demo_session')) {
                const demoBills = JSON.parse(localStorage.getItem('demo_bills') || '[]');
                setBills(demoBills);
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchBillDetails = async (bill: Bill, mode: 'view' | 'print') => {
        setLoadingBill(true);
        try {
            const { data: items, error } = await supabase
                .from('bill_items')
                .select('*')
                .eq('bill_id', bill.id);

            if (error) throw error;

            const billWithItems = {
                ...bill,
                invoice_no: bill.invoice_no,
                bill_date: bill.bill_date,
                customer: bill.customer,
                items: items?.map(item => ({
                    ...item,
                    amount: item.quantity * item.price
                })) || [],
                total: bill.total_amount,
                cgstPercentage: bill.cgst_percentage || 9,
                sgstPercentage: bill.sgst_percentage || 9
            };

            setSelectedBill(billWithItems);
            setViewMode(mode);
        } catch (error) {
            console.error('Error fetching bill details:', error);
            // Demo fallback
            if (localStorage.getItem('demo_session')) {
                const demoBills = JSON.parse(localStorage.getItem('demo_bills') || '[]');
                const demoBill = demoBills.find((b: any) => b.id === bill.id);
                if (demoBill) {
                    setSelectedBill({
                        ...demoBill,
                        cgstPercentage: demoBill.cgst_percentage || 9,
                        sgstPercentage: demoBill.sgst_percentage || 9
                    });
                    setViewMode(mode);
                }
            }
        } finally {
            setLoadingBill(false);
        }
    };

    const closeModal = () => {
        setSelectedBill(null);
        setViewMode(null);
    };

    const formatInvoiceNumber = (num: number) => `AM_${num.toString().padStart(2, '0')}`;

    const filteredBills = bills.filter(bill =>
        bill.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formatInvoiceNumber(bill.invoice_no).toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Print/View Bill Component
    if (selectedBill && viewMode) {
        return (
            <div className="fixed inset-0 z-50 bg-white overflow-auto flex flex-col">
                {/* Header Controls - Hidden when printing */}
                <div className="print:hidden p-4 bg-slate-800 text-white flex justify-between items-center shadow-md">
                    <div className="flex items-center gap-3">
                        <span className="font-medium">
                            {viewMode === 'print' ? 'Print Preview' : 'Bill Details'} - {formatInvoiceNumber(selectedBill.invoice_no)}
                        </span>
                    </div>
                    <div className="flex gap-3">
                        {viewMode === 'view' && (
                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                            >
                                <Printer size={18} /> Print
                            </button>
                        )}
                        <button
                            onClick={closeModal}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                        >
                            <X size={18} /> Close
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
                                <h2 className="text-xs font-bold tracking-wider">MARUTHI SEVICE CENTRE & CAR GAS CONSULTANT, WATTER SERVICE & WHEEL ALIGNMENT</h2>
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
                                Invoice No: <span className="font-bold text-slate-800">{formatInvoiceNumber(selectedBill.invoice_no)}</span>
                            </div>
                            <div>
                                Date: <span className="font-bold text-slate-800">{format(new Date(selectedBill.bill_date), 'dd MMM yyyy')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Customer & Vehicle Details - Compact */}
                    <div className="mb-3 text-sm">
                        <div className="flex gap-4 mb-1">
                            <div className="flex-1">
                                <span className="font-bold text-slate-600 uppercase text-xs">Customer:</span>
                                <span className="font-bold text-slate-900 ml-1">{selectedBill.customer?.name}</span>
                            </div>
                            <div className="flex-1">
                                <span className="font-bold text-slate-600 uppercase text-xs">Phone:</span>
                                <span className="font-medium text-slate-900 ml-1">{selectedBill.customer?.phone}</span>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <span className="font-bold text-slate-600 uppercase text-xs">Vehicle No:</span>
                                <span className="font-bold text-slate-900 ml-1 uppercase">{selectedBill.customer?.vehicle_number || '-'}</span>
                            </div>
                            <div className="flex-1">
                                <span className="font-bold text-slate-600 uppercase text-xs">Vehicle Name:</span>
                                <span className="font-medium text-slate-900 ml-1">{selectedBill.customer?.vehicle_name || '-'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Table - Compact */}
                    <div className="mb-4">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-slate-300">
                                <tr>
                                    <th className="py-1.5 font-bold text-slate-700 w-10">#</th>
                                    <th className="py-1.5 font-bold text-slate-700">Item Description</th>
                                    <th className="py-1.5 font-bold text-slate-700 text-right w-24">Price</th>
                                    <th className="py-1.5 font-bold text-slate-700 text-center w-16">Qty</th>
                                    <th className="py-1.5 font-bold text-slate-700 text-right w-24">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {selectedBill.items?.map((item: any, index: number) => (
                                    <tr key={index}>
                                        <td className="py-1.5 text-slate-500">{index + 1}</td>
                                        <td className="py-1.5 font-medium">{item.description}</td>
                                        <td className="py-1.5 text-right text-slate-600">₹{item.price}</td>
                                        <td className="py-1.5 text-center text-slate-600">{item.quantity}</td>
                                        <td className="py-1.5 text-right font-bold">₹{item.amount?.toLocaleString('en-IN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals - Compact */}
                    <div className="flex justify-end border-t border-slate-800 pt-3">
                        <div className="w-56 space-y-1 text-sm">
                            <div className="flex justify-between text-slate-600">
                                <span>Subtotal</span>
                                <span>₹{selectedBill.total?.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>CGST ({selectedBill.cgstPercentage}%)</span>
                                <span>₹{(selectedBill.total * (selectedBill.cgstPercentage / 100)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>SGST ({selectedBill.sgstPercentage}%)</span>
                                <span>₹{(selectedBill.total * (selectedBill.sgstPercentage / 100)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-2">
                                <span>Grand Total</span>
                                <span>₹{(selectedBill.total * (1 + (selectedBill.cgstPercentage + selectedBill.sgstPercentage) / 100)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>

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
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Bill History</h1>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by customer or invoice no..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                {/* Date filter could go here */}
            </div>

            {/* Bills Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-slate-600">Invoice No</th>
                            <th className="px-6 py-4 font-semibold text-slate-600">Date</th>
                            <th className="px-6 py-4 font-semibold text-slate-600">Customer</th>
                            <th className="px-6 py-4 font-semibold text-slate-600 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                    <div className="flex justify-center items-center gap-2">
                                        <Loader2 className="animate-spin h-5 w-5" />
                                        Loading history...
                                    </div>
                                </td>
                            </tr>
                        ) : filteredBills.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                    No bills found.
                                </td>
                            </tr>
                        ) : (
                            filteredBills.map((bill) => (
                                <tr key={bill.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-mono font-medium text-slate-900">
                                        {formatInvoiceNumber(bill.invoice_no)}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-slate-400" />
                                            {format(new Date(bill.bill_date), 'MMM dd, yyyy')}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">{bill.customer?.name}</div>
                                        <div className="text-xs text-slate-500">{bill.customer?.phone}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => fetchBillDetails(bill, 'print')}
                                            disabled={loadingBill}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-2 disabled:opacity-50"
                                            title="Print Bill"
                                        >
                                            <Printer size={18} />
                                        </button>
                                        <button
                                            onClick={() => fetchBillDetails(bill, 'view')}
                                            disabled={loadingBill}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                                            title="View Bill"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
