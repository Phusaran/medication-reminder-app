import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AdminHomeScreen({ navigation }) {
  const handleLogout = () => navigation.replace('Login');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ผู้ดูแลระบบ (Admin)</Text>
        <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <TouchableOpacity 
            style={styles.menuCard}
            onPress={() => navigation.navigate('AdminUserManagement')}
        >
            <View style={[styles.iconBox, {backgroundColor: '#e3f2fd'}]}>
                <Ionicons name="people" size={32} color="#0056b3" />
            </View>
            <View>
                <Text style={styles.menuTitle}>จัดการผู้ใช้งาน</Text>
                <Text style={styles.menuSubtitle}>ดูรายชื่อและลบผู้ใช้งาน</Text>
            </View>
        </TouchableOpacity>

        <TouchableOpacity 
            style={styles.menuCard}
            onPress={() => navigation.navigate('AdminMedicationMaster')}
        >
            <View style={[styles.iconBox, {backgroundColor: '#e8f5e9'}]}>
                <Ionicons name="medkit" size={32} color="#2e7d32" />
            </View>
            <View>
                <Text style={styles.menuTitle}>จัดการคลังยาหลัก</Text>
                <Text style={styles.menuSubtitle}>เพิ่มข้อมูลยาเข้าสู่ระบบกลาง</Text>
            </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#333', padding: 20, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  content: { padding: 20 },
  menuCard: { backgroundColor: '#fff', padding: 20, borderRadius: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 20, elevation: 3 },
  iconBox: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginRight: 20 },
  menuTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  menuSubtitle: { color: '#666', marginTop: 5 }
});