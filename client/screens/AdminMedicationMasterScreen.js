import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import axios from 'axios';
// ✅ Import Config
import { API_URL } from '../constants/config';

export default function AdminMedicationMasterScreen({ navigation }) {
  const [meds, setMeds] = useState([]);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [unit, setUnit] = useState('เม็ด');

  useEffect(() => { fetchMeds(); }, []);

  const fetchMeds = async () => {
    try {
      // ✅ ดึงรายชื่อยาจาก Master
      const response = await axios.get(`${API_URL}/master-medications`);
      setMeds(response.data);
    } catch (error) { console.log(error); }
  };

  const handleAdd = async () => {
    if (!name) return Alert.alert('แจ้งเตือน', 'กรุณาระบุชื่อยา');
    try {
      // ✅ เพิ่มยาเข้า Master
      await axios.post(`${API_URL}/admin/medications`, {
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
            <Text style={styles.title}>คลังยาหลัก (Master)</Text>
        </View>

        <View style={styles.form}>
            <Text style={{fontWeight: 'bold', marginBottom: 10}}>เพิ่มยาใหม่</Text>
            <TextInput style={styles.input} placeholder="ชื่อสามัญทางยา" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="คำอธิบาย / สรรพคุณ" value={desc} onChangeText={setDesc} />
            <TextInput style={styles.input} placeholder="หน่วยนับ (เช่น เม็ด)" value={unit} onChangeText={setUnit} />
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
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10 },
  name: { fontSize: 16, fontWeight: 'bold' },
  detail: { color: '#666' }
});