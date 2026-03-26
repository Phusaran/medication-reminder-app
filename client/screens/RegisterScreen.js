import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { API_URL } from '../constants/config';
// ✅ Import KeyboardWrapper
import KeyboardWrapper from '../components/KeyboardWrapper';

export default function RegisterScreen({ route, navigation }) {
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState(route.params?.initialRole || 'user');

  const handleRegister = async () => {
    if (!firstname || !lastname || !email || !password) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }

    setLoading(true);
    
    try {
      const endpoint = role === 'user' ? `${API_URL}/register` : `${API_URL}/caregiver/register`;
      
      await axios.post(endpoint, { firstname, lastname, email, password }, { timeout: 5000 });

      if (Platform.OS === 'web') {
          window.alert(`สมัครสมาชิก (${role === 'user' ? 'ผู้ใช้งาน' : 'ผู้ดูแล'}) เรียบร้อยแล้ว!`);
          navigation.navigate('Login');
      } else {
          Alert.alert("สำเร็จ", `สมัครสมาชิก (${role === 'user' ? 'ผู้ใช้งาน' : 'ผู้ดูแล'}) เรียบร้อยแล้ว!`, [
            { text: "ตกลง", onPress: () => navigation.navigate('Login') }
          ]);
      }
    } catch (error) {
      console.log("Register Error:", error.response?.data || error.message);
      Alert.alert("ผิดพลาด", error.response?.data?.message || "ไม่สามารถสมัครสมาชิกได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    // ✅ เอา KeyboardWrapper ครอบแทน
    <KeyboardWrapper>
      <View style={styles.scrollContent}>
        <View style={styles.header}>
            <Text style={styles.title}>สร้างบัญชีใหม่</Text>
            <Text style={styles.subtitle}>เพื่อเริ่มต้นใช้งานระบบ</Text>
        </View>

        <View style={styles.roleContainer}>
          <TouchableOpacity style={[styles.roleButton, role === 'user' && styles.roleButtonActive]} onPress={() => setRole('user')}>
            <Text style={[styles.roleText, role === 'user' && styles.roleTextActive]}>สำหรับผู้ป่วย</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.roleButton, role === 'caregiver' && styles.roleButtonActive]} onPress={() => setRole('caregiver')}>
            <Text style={[styles.roleText, role === 'caregiver' && styles.roleTextActive]}>สำหรับผู้ดูแล</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
            <Text style={styles.label}>ชื่อจริง</Text>
            <TextInput style={styles.input} placeholder="สมชาย" value={firstname} onChangeText={setFirstname} />
            
            <Text style={styles.label}>นามสกุล</Text>
            <TextInput style={styles.input} placeholder="ใจดี" value={lastname} onChangeText={setLastname} />
            
            <Text style={styles.label}>อีเมล</Text>
            <TextInput style={styles.input} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
            
            <Text style={styles.label}>รหัสผ่าน</Text>
            <TextInput style={styles.input} placeholder="******" secureTextEntry value={password} onChangeText={setPassword} />

            <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleRegister} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>สมัครสมาชิก</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkContainer}>
                <Text style={styles.linkText}>มีบัญชีอยู่แล้ว? เข้าสู่ระบบ</Text>
            </TouchableOpacity>
        </View>
      </View>
    </KeyboardWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  header: { marginBottom: 20, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0056b3', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#666' },
  roleContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20, backgroundColor: '#f0f0f0', borderRadius: 10, padding: 5 },
  roleButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  roleButtonActive: { backgroundColor: '#0056b3' },
  roleText: { fontSize: 16, color: '#666', fontWeight: 'bold' },
  roleTextActive: { color: '#fff' },
  form: { width: '100%' },
  label: { fontSize: 16, marginBottom: 8, color: '#333', fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 15, fontSize: 16, marginBottom: 20, backgroundColor: '#fafafa' },
  button: { backgroundColor: '#0056b3', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10, elevation: 5 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  linkContainer: { marginTop: 20, alignItems: 'center' },
  linkText: { color: '#0056b3', fontSize: 16 }
});