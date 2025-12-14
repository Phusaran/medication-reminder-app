import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
// ✅ Import Config
import { API_URL } from '../constants/config';

export default function RegisterScreen({ navigation }) {
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    if (!firstname || !lastname || !email || !password) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }

    try {
      // ✅ แก้ Path: /register
      await axios.post(`${API_URL}/register`, {
        firstname,
        lastname,
        email,
        password
      });

      Alert.alert("สำเร็จ", "สมัครสมาชิกเรียบร้อยแล้ว!", [
        { text: "ตกลง", onPress: () => navigation.navigate('Login') }
      ]);
    } catch (error) {
      console.log(error);
      Alert.alert("ผิดพลาด", "ไม่สามารถสมัครสมาชิกได้ (อีเมลอาจซ้ำ)");
    }
  };
  // ... (ส่วน UI เหมือนเดิม)
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
            <Text style={styles.title}>สร้างบัญชีใหม่</Text>
            <Text style={styles.subtitle}>เพื่อเริ่มต้นดูแลสุขภาพของคุณ</Text>
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

            <TouchableOpacity style={styles.button} onPress={handleRegister}>
                <Text style={styles.buttonText}>สมัครสมาชิก</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkContainer}>
                <Text style={styles.linkText}>มีบัญชีอยู่แล้ว? เข้าสู่ระบบ</Text>
            </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  header: { marginBottom: 30, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0056b3', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#666' },
  form: { width: '100%' },
  label: { fontSize: 16, marginBottom: 8, color: '#333', fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 15, fontSize: 16, marginBottom: 20, backgroundColor: '#fafafa' },
  button: { backgroundColor: '#0056b3', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10, elevation: 5 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  linkContainer: { marginTop: 20, alignItems: 'center' },
  linkText: { color: '#0056b3', fontSize: 16 }
});