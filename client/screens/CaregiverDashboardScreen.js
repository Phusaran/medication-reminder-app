// ไฟล์: screens/CaregiverDashboardScreen.js

import React, { useState, useEffect } from 'react';
// ✅ 1. เพิ่ม Image ใน import
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

// ⚠️ เช็ค IP
const BASE_URL = 'http://192.168.0.31:3000/api';

export default function CaregiverDashboardScreen({ route, navigation }) {
  const { patient, caregiver } = route.params; // รับข้อมูลผู้ป่วย
  const [data, setData] = useState({ logs: [], percentage: 0 });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/caregiver/patient/${patient.id}/dashboard`);
      setData(response.data);
    } catch (error) { console.log(error); }
  };

  // ✅ ฟังก์ชันหัวใจสำคัญ: ไปหน้าจอต่างๆ โดยส่ง "User ของผู้ป่วย" ไปแทน
  const navigateAsPatient = (screenName) => {
    navigation.navigate(screenName, { 
        user: patient, // ส่ง patient ไปในชื่อ "user" เพื่อหลอกหน้าจอนั้นๆ
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
        <View>
            <Text style={styles.headerTitle}>{patient.firstname} {patient.lastname}</Text>
            <Text style={styles.subTitle}>กำลังดูข้อมูลในฐานะผู้ดูแล</Text>
        </View>
        
        {/* ✅ 2. แก้ไขส่วนรูปโปรไฟล์มุมขวาบน */}
        <View style={styles.smallAvatar}>
             {patient.profile_image ? (
                 <Image source={{ uri: patient.profile_image }} style={styles.avatarImage} />
             ) : (
                 <Ionicons name="person" size={20} color="#0056b3" />
             )}
        </View>
      </View>

      <ScrollView style={styles.content}>
        
        {/* 1. ส่วนสรุปผล (Dashboard) */}
        <View style={styles.summaryCard}>
            <View style={styles.statBox}>
                <Text style={styles.statNum}>{data.percentage}%</Text>
                <Text style={styles.statLabel}>วินัยเดือนนี้</Text>
            </View>
            <View style={styles.statLine} />
            <View style={styles.statBox}>
                <Text style={[styles.statNum, {color: '#f44336'}]}>
                    {data.logs.filter(l => l.status === 'skipped').length}
                </Text>
                <Text style={styles.statLabel}>ข้าม/ลืม (ครั้ง)</Text>
            </View>
        </View>

        {/* 2. ✅ เมนูจัดการแทนผู้ป่วย */}
        <Text style={styles.sectionTitle}>จัดการข้อมูลแทนผู้ป่วย</Text>
        <View style={styles.actionGrid}>
            <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => navigateAsPatient('Home')}
            >
                <View style={[styles.iconCircle, { backgroundColor: '#e3f2fd' }]}>
                    <Ionicons name="time" size={28} color="#0056b3" />
                </View>
                <Text style={styles.actionText}>ตารางยา & สต็อก</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => navigateAsPatient('History')}
            >
                <View style={[styles.iconCircle, { backgroundColor: '#e8f5e9' }]}>
                    <Ionicons name="document-text" size={28} color="#2e7d32" />
                </View>
                <Text style={styles.actionText}>ประวัติ & รายงาน</Text>
            </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>กิจกรรมล่าสุดของวันนี้</Text>
        {data.logs.length === 0 ? (
            <Text style={styles.empty}>วันนี้ยังไม่มีการบันทึก</Text>
        ) : (
            data.logs.map((log, index) => (
                <View key={index} style={styles.logItem}>
                    <View>
                        <Text style={styles.medName}>{log.custom_name}</Text>
                        <Text style={styles.time}>เวลา: {log.time_to_take}</Text>
                    </View>
                    <View style={[styles.badge, log.status === 'taken' ? styles.bgGreen : styles.bgRed]}>
                        <Text style={styles.badgeText}>
                            {log.status === 'taken' ? 'ทานแล้ว' : 'ข้าม/ลืม'}
                        </Text>
                    </View>
                </View>
            ))
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: { 
      backgroundColor: '#0056b3', padding: 20, paddingTop: 50, 
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' 
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginLeft: 10 },
  subTitle: { color: '#e0e0e0', fontSize: 12, marginLeft: 10 },
  
  // ✅ ปรับ Style Avatar ให้รองรับรูปภาพ
  smallAvatar: { 
      width: 40, height: 40, borderRadius: 20, 
      backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' 
  },
  avatarImage: { 
      width: 40, height: 40, borderRadius: 20 
  },
  
  content: { padding: 20 },
  
  // Dashboard Styles
  summaryCard: { backgroundColor: '#fff', borderRadius: 15, padding: 20, flexDirection: 'row', marginBottom: 20, elevation: 3 },
  statBox: { flex: 1, alignItems: 'center' },
  statLine: { width: 1, backgroundColor: '#eee' },
  statNum: { fontSize: 32, fontWeight: 'bold', color: '#4caf50' },
  statLabel: { color: '#888', marginTop: 5 },

  // Action Grid Styles
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#333', marginTop: 10 },
  actionGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  actionButton: { 
      backgroundColor: '#fff', width: '48%', padding: 20, borderRadius: 15, 
      alignItems: 'center', elevation: 2 
  },
  iconCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  actionText: { fontWeight: 'bold', color: '#555' },

  // Log List Styles
  logItem: { backgroundColor: '#fff', padding: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  medName: { fontSize: 16, fontWeight: 'bold' },
  time: { color: '#666', fontSize: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15 },
  bgGreen: { backgroundColor: '#e8f5e9' },
  bgRed: { backgroundColor: '#ffebee' },
  badgeText: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  empty: { textAlign: 'center', color: '#999', marginTop: 20 }
});