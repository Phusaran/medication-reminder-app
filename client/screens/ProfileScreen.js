import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // เพิ่ม import

export default function ProfileScreen({ route, navigation }) {
  const user = route.params?.user || { firstname: 'Guest', email: '' };

  const handleLogout = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileHeader}>
        {/* ✅ แสดงรูปโปรไฟล์ถ้ามี ถ้าไม่มีให้แสดง Icon */}
        {user.profile_image ? (
            <Image source={{ uri: user.profile_image }} style={styles.avatar} />
        ) : (
            <View style={[styles.avatar, styles.placeholderAvatar]}>
                <Ionicons name="person" size={50} color="#fff" />
            </View>
        )}
        
        <Text style={styles.name}>คุณ{user.firstname} {user.lastname}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <View style={styles.menuContainer}>
        <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('EditProfile', { user })}
        >
            <Text style={styles.menuText}>ข้อมูลส่วนตัว</Text>
        </TouchableOpacity>
        <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('ManageCaregiver', { user })}
        >
            <Text style={styles.menuText}>ผู้ดูแลของฉัน</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={handleLogout}>
            <Text style={[styles.menuText, { color: 'red' }]}>ออกจากระบบ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  profileHeader: { alignItems: 'center', padding: 40, backgroundColor: '#fff', marginBottom: 20 },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 15 },
  placeholderAvatar: { backgroundColor: '#0056b3', justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 20, fontWeight: 'bold' },
  email: { color: '#666', marginTop: 5 },
  menuContainer: { backgroundColor: '#fff', paddingHorizontal: 20 },
  menuItem: { paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  menuText: { fontSize: 16 }
});