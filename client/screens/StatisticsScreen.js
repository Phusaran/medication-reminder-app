import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import { BarChart, PieChart } from "react-native-chart-kit";
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
// ✅ Import Config
import { API_URL } from '../constants/config';

// คำนวณความกว้างหน้าจอเพื่อกำหนดขนาดกราฟ
const screenWidth = Dimensions.get("window").width;

export default function StatisticsScreen({ route, navigation }) {
    const user = route.params?.user || { id: 0, firstname: 'Guest' };
    const [loading, setLoading] = useState(true);
    
    // State สำหรับข้อมูลกราฟ
    const [stats, setStats] = useState({ barData: null, pieData: [] });
    // State สำหรับรายการยาใกล้หมด
    const [lowStockMeds, setLowStockMeds] = useState([]);

    useEffect(() => {
        if (user.id !== 0) {
            fetchData();
        }
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // ดึงข้อมูลพร้อมกันทั้งประวัติ (สำหรับกราฟ) และรายการยา (สำหรับสต็อก)
            await Promise.all([fetchStats(), fetchLowStock()]);
        } catch (error) {
            console.error("Fetch Data Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await axios.get(`${API_URL}/history/${user.id}`);
            processChartData(response.data);
        } catch (error) {
            console.log("Fetch Stats Error:", error);
        }
    };

    const fetchLowStock = async () => {
        try {
            // ดึงข้อมูลยาทั้งหมดของผู้ใช้
            const response = await axios.get(`${API_URL}/medications/${user.id}?all=true`);
            // กรองเฉพาะยาที่จำนวนคงเหลือต่ำกว่าเกณฑ์แจ้งเตือน
            const lowStock = response.data.filter(med => 
                med.current_quantity <= med.notify_threshold
            );
            setLowStockMeds(lowStock);
        } catch (error) {
            console.log("Fetch Low Stock Error:", error);
        }
    };

    const processChartData = (rawData) => {
        // 1. เตรียมข้อมูล Bar Chart (7 วันย้อนหลัง)
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        const dailyCounts = last7Days.map(date => {
            const dayLogs = rawData.filter(item => item.taken_at.startsWith(date));
            const taken = dayLogs.filter(item => item.status === 'taken').length;
            return taken;
        });

        // 2. เตรียมข้อมูล Pie Chart (สรุปสัดส่วนทั้งหมด)
        const totalTaken = rawData.filter(item => item.status === 'taken').length;
        const totalSkipped = rawData.filter(item => item.status === 'skipped').length;

        setStats({
            barData: {
                labels: last7Days.map(d => d.split('-')[2]), // แสดงเฉพาะวันที่
                datasets: [{ data: dailyCounts }]
            },
            pieData: [
                { name: "ทานแล้ว", population: totalTaken, color: "#4caf50", legendFontColor: "#7F7F7F", legendFontSize: 12 },
                { name: "ข้าม/ลืม", population: totalSkipped, color: "#f44336", legendFontColor: "#7F7F7F", legendFontSize: 12 },
            ]
        });
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0056b3" />
                <Text style={{marginTop: 10, color: '#666'}}>กำลังประมวลผลข้อมูล...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
            <View style={styles.header}>
                <Text style={styles.title}>สถิติภาพรวม</Text>
                <TouchableOpacity onPress={fetchData}>
                    <Ionicons name="refresh" size={24} color="#0056b3" />
                </TouchableOpacity>
            </View>
            
            {/* กราฟแท่ง: จำนวนการทานยา 7 วันย้อนหลัง */}
            <View style={styles.chartBox}>
                <Text style={styles.chartTitle}>จำนวนครั้งที่ทานยา (7 วันที่ผ่านมา)</Text>
                {stats.barData && (
                    <BarChart
                        data={stats.barData}
                        width={screenWidth - 70} // หักลบ Padding เพื่อไม่ให้ล้นจอ
                        height={220}
                        chartConfig={chartConfig}
                        verticalLabelRotation={0}
                        fromZero
                        style={styles.chartStyle}
                    />
                )}
            </View>

            {/* กราฟวงกลม: สรุปสัดส่วนการทานยา */}
            <View style={styles.chartBox}>
                <Text style={styles.chartTitle}>สัดส่วนการทานยาโดยรวม</Text>
                {stats.pieData.length > 0 && (
                    <PieChart
                        data={stats.pieData}
                        width={screenWidth - 70}
                        height={180}
                        chartConfig={chartConfig}
                        accessor={"population"}
                        backgroundColor={"transparent"}
                        paddingLeft={"15"}
                        absolute // แสดงเป็นจำนวนตัวเลข
                    />
                )}
            </View>

            {/* ส่วนสรุปสต็อกยา: รายการยาที่ใกล้หมด */}
            <View style={styles.chartBox}>
                <View style={styles.stockHeader}>
                    <Ionicons name="warning-outline" size={20} color="#d32f2f" />
                    <Text style={[styles.chartTitle, { color: '#d32f2f', marginBottom: 0, marginLeft: 5 }]}>
                        รายการยาใกล้หมด
                    </Text>
                </View>
                
                {lowStockMeds.length > 0 ? (
                    lowStockMeds.map((med, index) => (
                        <View key={index} style={styles.stockItem}>
                            <Text style={styles.stockName}>{med.custom_name}</Text>
                            <Text style={styles.stockValue}>
                                คงเหลือ: <Text style={{fontWeight: 'bold'}}>{med.current_quantity}</Text> {med.dosage_unit}
                            </Text>
                        </View>
                    ))
                ) : (
                    <Text style={styles.emptyStockText}>คลังยาของคุณยังมีจำนวนเพียงพอ</Text>
                )}
            </View>
        </ScrollView>
    );
}

const chartConfig = {
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    decimalPlaces: 0, // ไม่แสดงทศนิยม
    color: (opacity = 1) => `rgba(0, 86, 179, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    propsForBackgroundLines: {
        strokeDasharray: "", // เส้นพื้นหลังแบบทึบ
    },
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#333' },
    chartBox: { 
        backgroundColor: '#fff', 
        borderRadius: 15, 
        padding: 15, 
        marginBottom: 20, 
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    chartTitle: { fontSize: 16, fontWeight: '600', marginBottom: 15, color: '#555' },
    chartStyle: {
        marginVertical: 8,
        borderRadius: 16,
        paddingRight: 40
    },
    stockHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    stockItem: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        paddingVertical: 12, 
        borderBottomWidth: 1, 
        borderBottomColor: '#eee' 
    },
    stockName: { fontSize: 15, color: '#333' },
    stockValue: { fontSize: 14, color: '#d32f2f' },
    emptyStockText: { color: '#888', textAlign: 'center', paddingVertical: 10, fontStyle: 'italic' }
});