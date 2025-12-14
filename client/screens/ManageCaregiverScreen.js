import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
// ✅ Import Config
import { API_URL } from '../constants/config';

export default function ManageCaregiverScreen({ route, navigation }) {
  const { user } = route.params;
  const [caregivers, setCaregivers] = useState([]);

  useEffect(() => {
    fetchCaregivers();
  }, []);

  const fetchCaregivers = async () => {
    try {
      // ✅ แก้ Path: /caregivers/${user.id}
      const response = await axios.get(`${API_URL}/caregivers/${user.id}`);
      setCaregivers(response.data);
    } catch (error) { console.log(error); }
  };

  const handleDelete = (id) => {
    Alert.alert('ยืนยัน', 'ต้องการลบผู้ดูแลคนนี้?', [
      { text: 'ยกเลิก' },
      { text: 'ลบ', style: 'destructive', onPress: async () => {
          // ✅ แก้ Path: /caregivers/${id}
          await axios.delete(`${API_URL}/caregivers/${id}`);
          fetchCaregivers();
      }}
    ]);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', { 
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>QR Code ของฉัน</Text>
        <View style={{width: 28}} /> 
      </View>

      <View style={styles.content}>
        <View style={styles.qrContainer}>
            <Text style={styles.qrTitle}>สแกนเพื่อเพิ่มฉันเป็นผู้ป่วย</Text>
            <View style={styles.qrWrapper}>
                <QRCode value={user.invite_code || "NO_CODE"} size={200} />
            </View>
            <Text style={styles.qrRef}>My Code: {user.invite_code || "-"}</Text>
        </View>

        <Text style={styles.sectionTitle}>ผู้ดูแลปัจจุบัน ({caregivers.length})</Text>
        <FlatList
            data={caregivers}
            keyExtractor={item => item.caring_id.toString()}
            renderItem={({ item }) => (
                <View style={styles.card}>
                    <View style={{flexDirection:'row', alignItems:'center', flex: 1}}>
                        <Ionicons name="person-circle" size={40} color="#ccc" style={{marginRight:10}}/>
                        <View>
                            <Text style={styles.name}>{item.firstname} {item.lastname}</Text>
                            <Text style={styles.email}>{item.email}</Text>
                            <Text style={styles.dateText}>เพิ่มเมื่อ: {formatDate(item.granted_date)}</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(item.caring_id)}>
                        <Ionicons name="trash-outline" size={24} color="#f44336" />
                    </TouchableOpacity>
                </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>ยังไม่มีผู้ดูแล</Text>}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: { backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 50, alignItems: 'center', elevation: 2 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  content: { flex: 1, padding: 20 },
  qrContainer: { backgroundColor: '#fff', padding: 30, borderRadius: 20, alignItems: 'center', marginBottom: 30, elevation: 4 },
  qrTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 20, color: '#0056b3' },
  qrWrapper: { padding: 10, backgroundColor: '#fff' },
  qrRef: { marginTop: 15, color: '#888', fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#666' },
  card: { backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 10, marginBottom: 10, elevation: 2 },
  name: { fontWeight: 'bold', color: '#333' },
  email: { color: '#666', fontSize: 12 },
  dateText: { color: '#0056b3', fontSize: 11, marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 10 }
});