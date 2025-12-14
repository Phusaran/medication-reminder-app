import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, Image, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
// ✅ Import Config
import { API_URL } from '../constants/config';

export default function EditProfileScreen({ route, navigation }) {
  const { user } = route.params;
  
  const [firstname, setFirstname] = useState(user.firstname);
  const [lastname, setLastname] = useState(user.lastname);
  const [password, setPassword] = useState('');
  const [image, setImage] = useState(user.profile_image); 
  const [newImageSelected, setNewImageSelected] = useState(false);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('ขออภัย', 'ต้องการสิทธิ์เข้าถึงรูปภาพ'); return; }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.5,
    });
    if (!result.canceled) { setImage(result.assets[0].uri); setNewImageSelected(true); }
  };

  const handleSave = async () => {
    if (!firstname || !lastname) { Alert.alert('แจ้งเตือน', 'กรุณาระบุชื่อและนามสกุล'); return; }

    setLoading(true);
    try {
        let finalImageUrl = image;

        if (newImageSelected) {
            const formData = new FormData();
            formData.append('profileImage', { uri: image, name: 'profile.jpg', type: 'image/jpeg' });
            // ✅ แก้ Path: /upload
            const uploadRes = await axios.post(`${API_URL}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            if (uploadRes.status === 200) finalImageUrl = uploadRes.data.url;
        }

        const payload = { firstname, lastname, password: password || undefined, profile_image: finalImageUrl };

        // ✅ แก้ Path: /users/${user.id}
        const response = await axios.put(`${API_URL}/users/${user.id}`, payload);

        if (response.status === 200) {
            const updatedUser = { ...response.data, id: response.data.user_id };
            Alert.alert("สำเร็จ", "บันทึกข้อมูลเรียบร้อยแล้ว", [
                { text: "ตกลง", onPress: () => navigation.navigate('Home', { user: updatedUser }) } 
            ]);
        }
    } catch (error) { console.log(error); Alert.alert("ผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้"); } 
    finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={28} color="#333" /></TouchableOpacity>
        <Text style={styles.title}>แก้ไขข้อมูลส่วนตัว</Text>
        <View style={{width: 28}} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.avatarContainer}>
            <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
                {image ? (<Image source={{ uri: image }} style={styles.avatarImage} />) : (<View style={[styles.avatarImage, styles.placeholderAvatar]}><Ionicons name="person" size={60} color="#fff" /></View>)}
                <View style={styles.cameraIcon}><Ionicons name="camera" size={20} color="#fff" /></View>
            </TouchableOpacity>
            <Text style={styles.changePhotoText}>แตะเพื่อเปลี่ยนรูป</Text>
            <Text style={styles.emailText}>{user.email}</Text>
        </View>

        <View style={styles.form}>
            <Text style={styles.label}>ชื่อจริง</Text>
            <TextInput style={styles.input} value={firstname} onChangeText={setFirstname} />
            <Text style={styles.label}>นามสกุล</Text>
            <TextInput style={styles.input} value={lastname} onChangeText={setLastname} />
            <Text style={styles.label}>เปลี่ยนรหัสผ่าน</Text>
            <TextInput style={styles.input} placeholder="ระบุรหัสผ่านใหม่ (ถ้าต้องการ)" secureTextEntry value={password} onChangeText={setPassword} />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
                {loading ? (<ActivityIndicator color="#fff" />) : (<Text style={styles.saveBtnText}>บันทึกการเปลี่ยนแปลง</Text>)}
            </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 18, fontWeight: 'bold' },
  content: { padding: 20 },
  avatarContainer: { alignItems: 'center', marginBottom: 30 },
  avatarWrapper: { position: 'relative' },
  avatarImage: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#eee' },
  placeholderAvatar: { backgroundColor: '#0056b3', justifyContent: 'center', alignItems: 'center' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#0056b3', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  changePhotoText: { color: '#0056b3', marginTop: 10, fontWeight: 'bold' },
  emailText: { color: '#666', fontSize: 16, marginTop: 5 },
  form: { width: '100%' },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 20, backgroundColor: '#fafafa' },
  saveBtn: { backgroundColor: '#0056b3', padding: 15, borderRadius: 30, alignItems: 'center', marginTop: 10, elevation: 3 },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});