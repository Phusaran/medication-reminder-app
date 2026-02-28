import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import NetInfo from '@react-native-community/netinfo';
import { addDoseToQueue } from '../utils/offlineQueue';

// ✅ Import Config
import { API_URL } from '../constants/config';

export default function AlarmScreen({ route, navigation }) {
  const { medName, scheduleId } = route.params || {}; 
  const [loading, setLoading] = useState(false);

  const handleTakePill = async () => {
    if (!scheduleId) {
        navigation.goBack();
        return;
    }

    setLoading(true);
    const payload = { schedule_id: scheduleId, status: 'taken' };

    // ✅ เพิ่ม Log ดูว่าหน้าแจ้งเตือนส่งค่าอะไรมาบ้าง
    console.log("⏰ [AlarmScreen] กำลังส่งข้อมูล:", payload);

    try {
        const state = await NetInfo.fetch();
        if (state.isConnected) {
            // ✅ มีเน็ต ยิง API ปกติ
            const response = await axios.post(`${API_URL}/log-dose`, payload);
            
            // ✅ เพิ่มการดักจับข้อความแจ้งเตือนจาก Server (เหมือนหน้า Home)
            if (response.data.message === 'วันนี้คุณบันทึกยานี้ไปแล้ว') {
                Alert.alert("แจ้งเตือน", "ยาในมื้อนี้ ถูกบันทึกว่าทานไปแล้ว ระบบจึงไม่ตัดสต็อกซ้ำครับ");
            } else if (response.data.alert) {
                 Alert.alert("แจ้งเตือน", response.data.alert);
            } else {
                 Alert.alert("เรียบร้อย", "บันทึกและตัดสต็อกยาแล้ว!");
            }
        } else {
            // ❌ ไม่มีเน็ต เอาลงคิว
            await addDoseToQueue(payload);
            Alert.alert("โหมดออฟไลน์", "บันทึกไว้ในเครื่องแล้ว ระบบจะซิงค์เมื่อมีอินเทอร์เน็ต");
        }
        navigation.goBack(); 

    } catch (error) {
        console.log("AlarmScreen Error:", error);
        // ❌ เน็ตหลุดจังหวะที่ยิง API พอดี ก็เอาลงคิวเช่นกัน
        await addDoseToQueue(payload);
        Alert.alert("โหมดออฟไลน์", "บันทึกข้อมูลไว้ในเครื่องแล้ว");
        navigation.goBack();
    } finally {
        setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="alarm" size={80} color="#fff" />
      </View>

      <Text style={styles.title}>⏰ ถึงเวลาแล้ว!</Text>
      <Text style={styles.subtitle}>กรุณาทานยา</Text>
      
      <Text style={styles.medName}>{medName || "ได้เวลาทานยา"}</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.takenButton} onPress={handleTakePill} disabled={loading}>
            {loading ? (<ActivityIndicator color="#0056b3" />) : (<Text style={styles.takenText}>กินยาแล้ว</Text>)}
        </TouchableOpacity>

        <TouchableOpacity style={styles.snoozeButton} onPress={() => navigation.goBack()}>
            <Text style={styles.snoozeText}>ปิด / เลื่อนไปก่อน</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0056b3', alignItems: 'center', justifyContent: 'center', padding: 20 },
  iconContainer: { marginBottom: 30, padding: 20, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.2)' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
  subtitle: { fontSize: 18, color: '#d1e3ff', marginBottom: 20 },
  medName: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 50, textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 15 },
  buttonContainer: { width: '100%', alignItems: 'center' },
  takenButton: { backgroundColor: '#fff', width: '80%', padding: 15, borderRadius: 30, alignItems: 'center', marginBottom: 15, elevation: 5 },
  takenText: { fontSize: 20, fontWeight: 'bold', color: '#0056b3' },
  snoozeButton: { padding: 15 },
  snoozeText: { fontSize: 16, color: '#rgba(255,255,255,0.8)' }
});