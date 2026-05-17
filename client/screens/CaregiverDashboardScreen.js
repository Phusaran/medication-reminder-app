import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications'; // ❇️ Import Notifications
// ✅ Import Config
import { API_URL } from '../constants/config';

// ❇️ ตั้งค่าให้แจ้งเตือนเด้งเสมอ (แก้ปีกกาให้ถูกต้องแล้ว)
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export default function CaregiverDashboardScreen({ route, navigation }) {
    const { patient, caregiver } = route.params; // รับข้อมูลผู้ป่วย
    const [data, setData] = useState({ logs: [], percentage: 0 });

    useEffect(() => {
        fetchData();
        syncPatientAlarms(); // ❇️ เรียกใช้ฟังก์ชันตั้งนาฬิกาปลุกทันทีที่เข้ามาหน้านี้
    }, []);

    const fetchData = async () => {
        try {
            // ✅ ใช้ ID ของผู้ป่วย
            const patientId = patient.id || patient.user_id;
            const response = await axios.get(`${API_URL}/caregiver/patient/${patientId}/dashboard`);
            setData(response.data);
        } catch (error) { console.log(error); }
    };

    // ❇️ ฟังก์ชันตั้งนาฬิกาปลุก (Local Notification) ในเครื่องของผู้ดูแล
    const syncPatientAlarms = async () => {
        try {
            // ขอสิทธิ์แจ้งเตือนในเครื่องผู้ดูแล
            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== 'granted') return;

            // ล้างการแจ้งเตือนเก่าที่เคยตั้งไว้ (เพื่ออัปเดตเวลาใหม่เสมอ)
            await Notifications.cancelAllScheduledNotificationsAsync();

            // ดึงข้อมูลยาของผู้ป่วยจาก API (เฉพาะยาที่ต้องทาน/Active อยู่)
            const patientId = patient.id || patient.user_id;
            const response = await axios.get(`${API_URL}/medications/${patientId}?all=false`);
            const meds = response.data;

            // วนลูปตั้งเวลาปลุกให้กับทุกคิวการกินยา
            for (let med of meds) {
                if (med.time_to_take) {
                    const [hours, minutes] = med.time_to_take.split(':');

                    await Notifications.scheduleNotificationAsync({
                        content: {
                            title: `🔔 แจ้งเตือน: ผู้ป่วย ${patient.firstname}`,
                            body: `ถึงเวลาทานยา ${med.custom_name} แล้ว! (${med.dosage_amount} ${med.dosage_unit})`,
                            sound: true,
                        },
                        trigger: {
                            hour: parseInt(hours),
                            minute: parseInt(minutes),
                            repeats: true, // ให้เตือนทุกวันตามเวลานี้
                            channelId: 'default',
                        },
                    });
                }
            }
            console.log(`✅ ตั้งเวลาปลุกผู้ป่วย ${patient.firstname} ในเครื่องผู้ดูแลสำเร็จ!`);
        } catch (error) {
            console.error('❌ ไม่สามารถตั้งเวลาปลุกได้:', error);
        }
    };

    const navigateAsPatient = (screenName) => {
        navigation.navigate(screenName, {
            user: patient,
            isCaregiverView: true,
            caregiver: caregiver
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>แดชบอร์ดของ {patient.firstname}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content}>
                {/* สรุปผลวันนี้ */}
                <View style={styles.summaryCard}>
                    <View style={styles.statBox}>
                        <Text style={styles.statNum}>{data.percentage}%</Text>
                        <Text style={styles.statLabel}>ความสม่ำเสมอ</Text>
                    </View>
                    <View style={styles.statLine} />
                    <View style={styles.statBox}>
                        <Text style={[styles.statNum, { color: '#0056b3' }]}>{data.logs.length}</Text>
                        <Text style={styles.statLabel}>รายการวันนี้</Text>
                    </View>
                </View>

                {/* เมนูลัด */}
                <Text style={styles.sectionTitle}>จัดการข้อมูล</Text>
                <View style={styles.actionGrid}>

                    <TouchableOpacity style={styles.actionButton} onPress={() => navigateAsPatient('Home')}>
                        <View style={[styles.iconCircle, { backgroundColor: '#ffebee' }]}>
                            <Ionicons name="list" size={24} color="#d32f2f" />
                        </View>
                        <Text style={styles.actionText}>จัดการข้อมูล</Text>
                    </TouchableOpacity>
                </View>

                {/* ประวัติการกินยาล่าสุด */}
                <Text style={styles.sectionTitle}>ประวัติวันนี้</Text>
                {data.logs.length === 0 ? (
                    <Text style={{ color: '#999', textAlign: 'center', marginTop: 20 }}>ยังไม่มีประวัติการทานยาในวันนี้</Text>
                ) : (
                    data.logs.map((log, index) => (
                        <View key={index} style={styles.logItem}>
                            <View>
                                <Text style={styles.medName}>{log.custom_name}</Text>
                                <Text style={styles.timeText}>
                                    เวลา: {log.time_to_take.substring(0, 5)} น.
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons
                                    name={log.status === 'taken' ? "checkmark-circle" : "close-circle"}
                                    size={24}
                                    color={log.status === 'taken' ? "#4caf50" : "#f44336"}
                                />
                                <Text style={{ marginLeft: 5, color: log.status === 'taken' ? "#4caf50" : "#f44336" }}>
                                    {log.status === 'taken' ? 'ทานแล้ว' : 'ข้าม'}
                                </Text>
                            </View>
                        </View>
                    ))
                )}
                <View style={{ height: 50 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9f9f9' },
    header: { backgroundColor: '#0056b3', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    content: { padding: 20 },
    summaryCard: { backgroundColor: '#fff', borderRadius: 15, padding: 20, flexDirection: 'row', marginBottom: 20, elevation: 3 },
    statBox: { flex: 1, alignItems: 'center' },
    statLine: { width: 1, backgroundColor: '#eee' },
    statNum: { fontSize: 32, fontWeight: 'bold', color: '#4caf50' },
    statLabel: { color: '#888', marginTop: 5 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#333', marginTop: 10 },
    actionGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    actionButton: { backgroundColor: '#fff', width: '48%', padding: 20, borderRadius: 15, alignItems: 'center', elevation: 2 },
    iconCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    actionText: { fontWeight: 'bold', color: '#555' },
    logItem: { backgroundColor: '#fff', padding: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    medName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    timeText: { fontSize: 12, color: '#666', marginTop: 2 },
});