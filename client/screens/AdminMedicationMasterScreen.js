import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

// ⚠️ เช็ค IP
const API_URL = 'http://192.168.0.31:3000/api/admin/medications';

export default function AdminMedicationMasterScreen({ navigation }) {
  const [meds, setMeds] = useState([]);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [unit, setUnit] = useState('เม็ด');

  useEffect(() => { fetchMeds(); }, []);

  const fetchMeds = async () => {
    try {
      const response = await axios.get(API_URL);
      setMeds(response.data);
    } catch (error) { console.log(error); }
  };

  const handleAdd = async () => {
    if (!name) return Alert.alert('แจ้งเตือน', 'กรุณาระบุชื่อยา');
    try {
      await axios.post(API_URL, {
        generic_name: name,
        description: desc,
        dosage_unit: unit
      });
      Alert.alert('สำเร็จ', 'เพิ่มยาเรียบร้อย');
      setName(''); setDesc(''); fetchMeds();
    } catch (error) { Alert.alert('ผิดพลาด', 'เพิ่มยาไม่สำเร็จ'); }
  };

  return (
    <View style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#333"/></TouchableOpacity>
            <Text style={styles.title}>คลังยาหลัก</Text>
            <View style={{width: 24}}/>
        </View>

        <View style={styles.form}>
            <TextInput style={styles.input} placeholder="ชื่อยา (เช่น Aspirin)" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="สรรพคุณ (เช่น แก้ปวด)" value={desc} onChangeText={setDesc} />
            <TextInput style={styles.input} placeholder="หน่วย (เช่น เม็ด)" value={unit} onChangeText={setUnit} />
            <TouchableOpacity style={styles.btn} onPress={handleAdd}>
                <Text style={styles.btnText}>+ เพิ่มยาเข้าสู่ระบบ</Text>
            </TouchableOpacity>
        </View>

        <FlatList
            data={meds}
            keyExtractor={item => item.med_id.toString()}
            renderItem={({ item }) => (
                <View style={styles.card}>
                    <Text style={styles.name}>{item.generic_name}</Text>
                    <Text style={styles.detail}>{item.description} ({item.dosage_unit})</Text>
                </View>
            )}
            contentContainerStyle={{ padding: 20 }}
        />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: '#fff', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: 'bold' },
  form: { padding: 20, backgroundColor: '#fff', marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 10 },
  btn: { backgroundColor: '#2e7d32', padding: 12, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, elevation: 1 },
  name: { fontWeight: 'bold', fontSize: 16 },
  detail: { color: '#666' }
});