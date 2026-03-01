import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Modal, TextInput, Image, ScrollView } from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../constants/config';

export default function AdminUserManagementScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState({ id: '', firstname: '', lastname: '', email: '', profile_image: '' });

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/users`);
      setUsers(response.data);
    } catch (error) { console.log("Fetch Users Error:", error); }
  };

  const openEdit = (user) => {
    setSelectedUser({
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        profile_image: user.profile_image || ''
    });
    setEditModalVisible(true);
  };

  const handleUpdate = async () => {
    try {
      await axios.put(`${API_URL}/admin/users/${selectedUser.id}`, selectedUser);
      setEditModalVisible(false);
      fetchUsers();
      Alert.alert('สำเร็จ', 'อัปเดตข้อมูลผู้ใช้เรียบร้อย');
    } catch (error) { Alert.alert('ผิดพลาด', 'บันทึกข้อมูลไม่สำเร็จ'); }
  };

  const handleDelete = (id) => {
    Alert.alert('ยืนยัน', 'ลบผู้ใช้ออกจากระบบ?', [
      { text: 'ยกเลิก' },
      { text: 'ลบ', style: 'destructive', onPress: async () => {
          try {
            await axios.delete(`${API_URL}/admin/users/${id}`);
            fetchUsers();
          } catch (err) { Alert.alert('ผิดพลาด', 'ลบไม่ได้'); }
      }}
    ]);
  };

  return (
    <View style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#333"/></TouchableOpacity>
            <Text style={styles.title}>จัดการผู้ใช้งาน ({users.length})</Text>
            <View style={{width: 24}}/>
        </View>

        <FlatList
            data={users}
            keyExtractor={item => item.id.toString()}
            renderItem={({ item }) => (
                <View style={styles.card}>
                    <Image source={{ uri: item.profile_image || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }} style={styles.userAvatar} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{item.firstname} {item.lastname}</Text>
                        <Text style={styles.email}>{item.email}</Text>
                    </View>
                    <View style={styles.actionGroup}>
                        <TouchableOpacity onPress={() => openEdit(item)} style={{marginRight: 15}}><Ionicons name="create-outline" size={24} color="#0056b3" /></TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(item.id)}><Ionicons name="trash-outline" size={24} color="red" /></TouchableOpacity>
                    </View>
                </View>
            )}
            contentContainerStyle={{ padding: 20 }}
        />

        <Modal visible={editModalVisible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.modalTitle}>แก้ไขข้อมูลผู้ใช้</Text>
                        <View style={{alignItems: 'center', marginBottom: 20}}>
                            <Image source={{ uri: selectedUser.profile_image || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }} style={styles.previewImage} />
                        </View>

                        <Text style={styles.fieldLabel}>ชื่อจริง</Text>
                        <TextInput style={styles.input} value={selectedUser.firstname} onChangeText={(t) => setSelectedUser({...selectedUser, firstname: t})} />
                        
                        <Text style={styles.fieldLabel}>นามสกุล</Text>
                        <TextInput style={styles.input} value={selectedUser.lastname} onChangeText={(t) => setSelectedUser({...selectedUser, lastname: t})} />
                        
                        <Text style={styles.fieldLabel}>อีเมล</Text>
                        <TextInput style={styles.input} value={selectedUser.email} onChangeText={(t) => setSelectedUser({...selectedUser, email: t})} keyboardType="email-address" />
                        
                        <Text style={styles.fieldLabel}>URL รูปโปรไฟล์</Text>
                        <TextInput style={styles.input} value={selectedUser.profile_image} onChangeText={(t) => setSelectedUser({...selectedUser, profile_image: t})} />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModalVisible(false)}><Text>ยกเลิก</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleUpdate}><Text style={styles.saveText}>บันทึกข้อมูล</Text></TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: '#fff', alignItems: 'center', elevation: 2 },
  title: { fontSize: 18, fontWeight: 'bold' },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 10, flexDirection: 'row', alignItems: 'center', marginBottom: 10, elevation: 1 },
  userAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15, backgroundColor: '#eee' },
  name: { fontSize: 16, fontWeight: 'bold' },
  email: { color: '#666' },
  actionGroup: { flexDirection: 'row' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  fieldLabel: { fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 5, marginLeft: 5 },
  previewImage: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#eee', borderWidth: 1, borderColor: '#ddd' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, marginBottom: 15, backgroundColor: '#f9f9f9' },
  modalActions: { flexDirection: 'row', marginTop: 10 },
  cancelBtn: { flex: 1, padding: 15, marginRight: 10, backgroundColor: '#eee', borderRadius: 10, alignItems: 'center' },
  saveBtn: { flex: 1, padding: 15, backgroundColor: '#0056b3', borderRadius: 10, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: 'bold' }
});