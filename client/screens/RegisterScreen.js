import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform, ActivityIndicator, ScrollView } from 'react-native';
import axios from 'axios';
import { API_URL } from '../constants/config';
import KeyboardWrapper from '../components/KeyboardWrapper';

export default function RegisterScreen({ route, navigation }) {
    const [firstname, setFirstname] = useState('');
    const [lastname, setLastname] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [gender, setGender] = useState('');
    const [age, setAge] = useState('');
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');

    const [loading, setLoading] = useState(false);
    const [role, setRole] = useState(route.params?.initialRole || 'user');

    const handleRegister = async () => {
        if (!firstname || !lastname || !email || !password) {
            Alert.alert('แจ้งเตือน', 'กรุณากรอกข้อมูลหลักให้ครบทุกช่อง');
            return;
        }

        setLoading(true);

        try {
            const endpoint = role === 'user' ? `${API_URL}/register` : `${API_URL}/caregiver/register`;

            const payload = {
                firstname,
                lastname,
                email,
                password,
                ...(role === 'user' && {
                    gender: gender,
                    age: age ? parseInt(age, 10) : null,
                    weight: weight ? parseInt(weight, 10) : null, // ❇️ เปลี่ยนเป็น parseInt
                    height: height ? parseInt(height, 10) : null  // ❇️ เปลี่ยนเป็น parseInt
                })
            };

            await axios.post(endpoint, payload, { timeout: 5000 });

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
        <KeyboardWrapper>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
                    <Text style={styles.sectionTitle}>ข้อมูลบัญชี</Text>

                    <Text style={styles.label}>ชื่อจริง</Text>
                    <TextInput style={styles.input} placeholder="สมชาย" value={firstname} onChangeText={setFirstname} />

                    <Text style={styles.label}>นามสกุล</Text>
                    <TextInput style={styles.input} placeholder="ใจดี" value={lastname} onChangeText={setLastname} />

                    <Text style={styles.label}>อีเมล</Text>
                    <TextInput style={styles.input} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />

                    <Text style={styles.label}>รหัสผ่าน</Text>
                    <TextInput style={styles.input} placeholder="******" secureTextEntry value={password} onChangeText={setPassword} />

                    {role === 'user' && (
                        <View style={styles.healthSection}>
                            <Text style={styles.sectionTitle}>ข้อมูลสุขภาพ (ไม่บังคับ)</Text>

                            <View style={styles.row}>
                                <View style={{ flex: 1, marginRight: 10 }}>
                                    <Text style={styles.label}>เพศ</Text>
                                    <TextInput style={styles.input} placeholder="ชาย/หญิง/อื่นๆ" value={gender} onChangeText={setGender} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>อายุ (ปี)</Text>
                                    <TextInput style={styles.input} placeholder="เช่น 25" keyboardType="numeric" value={age} onChangeText={setAge} />
                                </View>
                            </View>

                            <View style={styles.row}>
                                <View style={{ flex: 1, marginRight: 10 }}>
                                    <Text style={styles.label}>น้ำหนัก (กก.)</Text>
                                    {/* ❇️ แก้ไข Placeholder ให้เป็นจำนวนเต็ม */}
                                    <TextInput style={styles.input} placeholder="เช่น 60" keyboardType="numeric" value={weight} onChangeText={setWeight} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>ส่วนสูง (ซม.)</Text>
                                    <TextInput style={styles.input} placeholder="เช่น 170" keyboardType="numeric" value={height} onChangeText={setHeight} />
                                </View>
                            </View>
                        </View>
                    )}

                    <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleRegister} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>สมัครสมาชิก</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkContainer}>
                        <Text style={styles.linkText}>มีบัญชีอยู่แล้ว? เข้าสู่ระบบ</Text>
                    </TouchableOpacity>
                    <View style={{ height: 40 }} />
                </View>
            </ScrollView>
        </KeyboardWrapper>
    );
}

const styles = StyleSheet.create({
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff', paddingTop: 50 },
    header: { marginBottom: 20, alignItems: 'center' },
    title: { fontSize: 28, fontWeight: 'bold', color: '#0056b3', marginBottom: 10 },
    subtitle: { fontSize: 16, color: '#666' },
    roleContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20, backgroundColor: '#f0f0f0', borderRadius: 10, padding: 5 },
    roleButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    roleButtonActive: { backgroundColor: '#0056b3' },
    roleText: { fontSize: 16, color: '#666', fontWeight: 'bold' },
    roleTextActive: { color: '#fff' },
    form: { width: '100%' },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0056b3', marginBottom: 15, marginTop: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5 },
    healthSection: { backgroundColor: '#f9faff', padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#e3e8fa' },
    label: { fontSize: 14, marginBottom: 8, color: '#555', fontWeight: 'bold' },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 15, backgroundColor: '#fafafa' },
    button: { backgroundColor: '#0056b3', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 15, elevation: 3 },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    linkContainer: { marginTop: 20, alignItems: 'center' },
    linkText: { color: '#0056b3', fontSize: 16 }
});