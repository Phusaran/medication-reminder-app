import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
// ✅ Import Config
import { API_URL } from '../constants/config';

export default function AddSymptomScreen({ route, navigation }) {
  const user = route.params?.user || { id: 0 };

  const [symptomName, setSymptomName] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState(1);

  const handleSave = async () => {
    if (!symptomName) {
      Alert.alert('แจ้งเตือน', 'กรุณาระบุชื่ออาการ');
      return;
    }

    try {
      // ✅ แก้ Path ให้ถูกต้อง
      const response = await axios.post(`${API_URL}/symptoms`, {
        user_id: user.id,
        symptom_name: symptomName,
        description: description,
        severity: severity
      });

      if (response.status === 201) {
        Alert.alert("สำเร็จ", "บันทึกอาการเรียบร้อยแล้ว");
        navigation.goBack();
      }
    } catch (error) {
      console.log(error);
      Alert.alert("ผิดพลาด", "บันทึกไม่สำเร็จ");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
           <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>บันทึกอาการป่วย</Text>
        <View style={{width: 30}} />
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>ชื่ออาการ</Text>
        <TextInput 
            style={styles.input} 
            placeholder="เช่น ปวดหัว, ตัวร้อน" 
            value={symptomName} 
            onChangeText={setSymptomName} 
        />

        <Text style={styles.label}>รายละเอียดเพิ่มเติม</Text>
        <TextInput 
            style={[styles.input, {height: 80}]} 
            placeholder="อธิบายลักษณะอาการ..." 
            multiline 
            value={description} 
            onChangeText={setDescription} 
        />

        <Text style={styles.label}>ระดับความรุนแรง (1-5)</Text>
        <View style={styles.severityContainer}>
            {[1, 2, 3, 4, 5].map((level) => (
                <TouchableOpacity 
                    key={level} 
                    style={[
                        styles.severityButton, 
                        severity === level && { backgroundColor: '#d32f2f', borderColor: '#d32f2f' }
                    ]}
                    onPress={() => setSeverity(level)}
                >
                    <Text style={[
                        { fontSize: 18, fontWeight: 'bold', color: '#333' },
                        severity === level && { color: '#fff' }
                    ]}>
                        {level}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
        <Text style={{textAlign: 'center', color: '#666', marginBottom: 30}}>
            {severity === 1 ? 'เล็กน้อย' : severity === 5 ? 'รุนแรงมาก' : 'ปานกลาง'}
        </Text>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>บันทึก</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { 
    paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, 
    borderBottomWidth: 1, borderBottomColor: '#eee', 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  content: { padding: 20 },
  label: { fontSize: 16, marginBottom: 8, color: '#333', fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 20, backgroundColor: '#fafafa' },
  severityContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 10 },
  severityButton: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', backgroundColor: '#f5f5f5' },
  saveButton: { backgroundColor: '#d32f2f', padding: 15, borderRadius: 30, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});