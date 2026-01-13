
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { IndianRupee, ShoppingBag, Users, FileText, TrendingUp, Calendar } from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Dashboard() {
    const navigate = useNavigate();
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);

    const [stats, setStats] = useState({
        totalSales: 0,
        totalOrders: 0,
        totalProducts: 0,
        totalCustomers: 0
    });
    const [chartData, setChartData] = useState<any[]>([]);
    const [_loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, [selectedYear]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // Parallel fetching
            const [
                { count: productsCount },
                { count: customersCount },
                { data: bills }
            ] = await Promise.all([
                supabase.from('products').select('*', { count: 'exact', head: true }),
                supabase.from('customers').select('*', { count: 'exact', head: true }),
                supabase.from('bills').select('total_amount, created_at')
            ]);

            // Extract available years from bills
            const years = new Set<number>();
            years.add(currentYear);
            bills?.forEach(bill => {
                const year = new Date(bill.created_at).getFullYear();
                years.add(year);
            });
            setAvailableYears(Array.from(years).sort((a, b) => b - a));

            // Filter bills for selected year
            const filteredBills = bills?.filter(bill => {
                const billYear = new Date(bill.created_at).getFullYear();
                return billYear === selectedYear;
            }) || [];

            const totalSales = filteredBills.reduce((sum, bill) => sum + (bill.total_amount || 0), 0);
            const totalOrders = filteredBills.length;

            // Process chart data (Sales by Month for selected year)
            const salesByMonth: Record<string, number> = {};
            MONTHS.forEach(month => {
                salesByMonth[month] = 0;
            });

            filteredBills.forEach(bill => {
                const monthIndex = new Date(bill.created_at).getMonth();
                const monthName = MONTHS[monthIndex];
                salesByMonth[monthName] = (salesByMonth[monthName] || 0) + bill.total_amount;
            });

            // Convert to array (all 12 months)
            const chartDataArray = MONTHS.map(month => ({
                name: month,
                sales: salesByMonth[month] || 0
            }));

            setStats({
                totalSales,
                totalOrders,
                totalProducts: productsCount || 0,
                totalCustomers: customersCount || 0
            });
            setChartData(chartDataArray);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            // Demo fallback
            if (localStorage.getItem('demo_session')) {
                const demoItems = JSON.parse(localStorage.getItem('demo_products') || '[]');
                const demoBills: any[] = JSON.parse(localStorage.getItem('demo_bills') || '[]');

                const totalSales = demoBills.reduce((sum, bill) => sum + bill.total_amount, 0);

                // MOCK CHART DATA - month wise
                const mockChartData = MONTHS.map((month, index) => ({
                    name: month,
                    sales: index === new Date().getMonth() ? (totalSales > 0 ? totalSales : 3490) : Math.floor(Math.random() * 5000)
                }));

                setStats({
                    totalSales: totalSales,
                    totalOrders: demoBills.length,
                    totalProducts: demoItems.length,
                    totalCustomers: 0
                });
                setChartData(mockChartData);
            }
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        { label: 'Total Revenue', value: `₹${stats.totalSales.toLocaleString()}`, icon: IndianRupee, color: 'bg-blue-500' },
        { label: 'Total Orders', value: stats.totalOrders, icon: FileText, color: 'bg-emerald-500' },
        { label: 'Products', value: stats.totalProducts, icon: ShoppingBag, color: 'bg-amber-500' },
        { label: 'Customers', value: stats.totalCustomers, icon: Users, color: 'bg-purple-500' },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Dashboard Overview</h1>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => (
                    <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                                <h3 className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</h3>
                            </div>
                            <div className={`p-3 rounded-lg ${stat.color} bg-opacity-10`}>
                                <stat.icon className={`h-6 w-6 ${stat.color.replace('bg-', 'text-')}`} />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-xs text-green-600 font-medium">
                            <TrendingUp size={14} className="mr-1" />
                            <span>+12.5% from last month</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Sales Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-slate-800">Revenue Analytics</h2>
                        {/* Year Selector */}
                        <div className="flex items-center gap-2">
                            <Calendar size={18} className="text-slate-400" />
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                            >
                                {availableYears.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} dy={10} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value) => [`₹${(value ?? 0).toLocaleString()}`, 'Sales']}
                                />
                                <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Activity / Side Panel */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h2>
                    <div className="space-y-3">
                        <button
                            onClick={() => navigate('/billing')}
                            className="w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center gap-3 transition-colors text-left"
                        >
                            <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                                <FileText size={18} />
                            </div>
                            <span className="font-medium text-slate-700">Create New Invoice</span>
                        </button>
                        <button
                            onClick={() => navigate('/products')}
                            className="w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center gap-3 transition-colors text-left"
                        >
                            <div className="p-2 bg-emerald-100 rounded-full text-emerald-600">
                                <ShoppingBag size={18} />
                            </div>
                            <span className="font-medium text-slate-700">Add New Product</span>
                        </button>
                        <button
                            onClick={() => navigate('/history')}
                            className="w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center gap-3 transition-colors text-left"
                        >
                            <div className="p-2 bg-purple-100 rounded-full text-purple-600">
                                <Users size={18} />
                            </div>
                            <span className="font-medium text-slate-700">Manage Customers</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
