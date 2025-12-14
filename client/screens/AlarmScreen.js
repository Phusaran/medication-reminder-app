import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

// ⚠️ IP เครื่องคุณ
const API_URL = 'http://192.168.0.31:3000/api/log-dose';

export default function AlarmScreen({ route, navigation }) {
  const { medName, scheduleId } = route.params || {}; // รับรหัสยามาด้วย
  const [loading, setLoading] = useState(false);

  const handleTakePill = async () => {
    if (!scheduleId) {
        // กรณีไม่มีรหัส (เช่น เป็นยาเก่าที่ตั้งเตือนไว้นานแล้ว) ให้ปิดไปเลย
        navigation.goBack();
        return;
    }

    setLoading(true);
    try {
        // ยิง API บันทึกการกินยา (Log Dose)
        await axios.post(API_URL, {
            schedule_id: scheduleId,
            status: 'taken'
        });
        
        Alert.alert("เรียบร้อย", "บันทึกและตัดสต็อกยาแล้ว!");
        navigation.goBack(); // กลับหน้าเดิม

    } catch (error) {
        console.log(error);
        Alert.alert("ผิดพลาด", "เชื่อมต่อ Server ไม่ได้");
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
        {/* ปุ่มกินยาแล้ว (ยิง API) */}
        <TouchableOpacity 
            style={styles.takenButton}
            onPress={handleTakePill}
            disabled={loading}
        >
            {loading ? (
                <ActivityIndicator color="#0056b3" />
            ) : (
                <Text style={styles.takenText}>กินยาแล้ว</Text>
            )}
        </TouchableOpacity>

        <TouchableOpacity 
            style={styles.snoozeButton}
            onPress={() => navigation.goBack()}
        >
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