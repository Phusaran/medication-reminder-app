import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import axios from 'axios';
// ✅ Import Config
import { API_URL } from '../constants/config';

export default function LoginScreen({ navigation }) {
  const [role, setRole] = useState('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    let endpoint = '/login';
    let payload = { email, password };

    if (role === 'caregiver') {
        endpoint = '/caregiver/login';
    } else if (role === 'admin') {
        endpoint = '/admin/login';
        payload = { username: email, password }; 
    }
    
    try {
      // ✅ ใช้ API_URL
      const response = await axios.post(`${API_URL}${endpoint}`, payload);
      
      if (response.status === 200) {
        const userData = response.data;
        if (role === 'user') {
            const userForApp = { ...userData, id: userData.user_id };
            navigation.replace('Home', { user: userForApp });
        } else if (role === 'caregiver') {
            navigation.replace('CaregiverHome', { caregiver: userData });
        } else {
            navigation.replace('AdminHome', { admin: userData });
        }
      }
    } catch (error) {
      console.log("Login Error:", error);
      Alert.alert("ผิดพลาด", error.response?.data?.message || "เข้าสู่ระบบไม่สำเร็จ");
    }
  };

  // ... (ส่วน render และ styles เหมือนเดิม ไม่ต้องแก้)
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png' }} style={styles.logo} />
        <Text style={styles.headerText}>CARE U</Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.toggleContainer}>
            {['user', 'caregiver', 'admin'].map((r) => (
                <TouchableOpacity 
                    key={r}
                    style={[styles.toggleBtn, role === r && styles.activeBtn]} 
                    onPress={() => setRole(r)}
                >
                    <Text style={[styles.toggleText, role === r && styles.activeText]}>
                        {r === 'user' ? 'ผู้ใช้' : r === 'caregiver' ? 'ผู้ดูแล' : 'Admin'}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>

        <Text style={styles.label}>{role === 'admin' ? 'ชื่อผู้ใช้ (Username)' : 'อีเมล'}</Text>
        <TextInput style={styles.input} placeholder={role === 'admin' ? "admin" : "ระบุอีเมล"} value={email} onChangeText={setEmail} autoCapitalize="none" />

        <Text style={styles.label}>รหัสผ่าน</Text>
        <TextInput style={styles.input} placeholder="ระบุรหัสผ่าน" value={password} onChangeText={setPassword} secureTextEntry />

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>เข้าสู่ระบบ</Text>
        </TouchableOpacity>

        {role === 'user' && (
            <View style={styles.registerContainer}>
                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                    <Text style={{ color: '#0056b3', fontSize: 16 }}>ยังไม่มีบัญชี? สมัครสมาชิก</Text>
                </TouchableOpacity>
            </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { backgroundColor: '#0056b3', height: 220, justifyContent: 'center', alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  logo: { width: 80, height: 80, tintColor: 'white', marginBottom: 10 },
  headerText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  formContainer: { padding: 30, marginTop: 10 },
  toggleContainer: { flexDirection: 'row', backgroundColor: '#f0f0f0', borderRadius: 25, padding: 4, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 20 },
  activeBtn: { backgroundColor: '#fff', elevation: 2 },
  toggleText: { fontSize: 14, color: '#888', fontWeight: 'bold' },
  activeText: { color: '#0056b3' },
  label: { fontSize: 16, color: '#333', marginBottom: 8, fontWeight: '600' },
  input: { borderBottomWidth: 1, borderBottomColor: '#ccc', paddingVertical: 10, marginBottom: 20, fontSize: 16 },
  button: { backgroundColor: '#0056b3', padding: 15, borderRadius: 25, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  registerContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 }
});