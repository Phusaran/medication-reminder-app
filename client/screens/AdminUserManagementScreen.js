import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

// ⚠️ เช็ค IP
const API_URL = 'http://192.168.0.31:3000/api/admin/users';

export default function AdminUserManagementScreen({ navigation }) {
  const [users, setUsers] = useState([]);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(API_URL);
      setUsers(response.data);
    } catch (error) { console.log(error); }
  };

  const handleDelete = (id) => {
    Alert.alert('ยืนยัน', 'ต้องการลบผู้ใช้นี้ออกจากระบบ?', [
      { text: 'ยกเลิก' },
      { text: 'ลบ', style: 'destructive', onPress: async () => {
          await axios.delete(`${API_URL}/${id}`);
          fetchUsers();
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
                    <View>
                        <Text style={styles.name}>{item.firstname} {item.lastname}</Text>
                        <Text style={styles.email}>{item.email}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(item.id)}>
                        <Ionicons name="trash-outline" size={24} color="red" />
                    </TouchableOpacity>
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
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, elevation: 2 },
  name: { fontWeight: 'bold', fontSize: 16 },
  email: { color: '#666' }
});