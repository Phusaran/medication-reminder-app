import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AdminHomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>แผงควบคุมแอดมิน</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity 
          style={styles.menuCard}
          onPress={() => navigation.navigate('AdminUserManagement')}
        >
          <Ionicons name="people" size={40} color="#0056b3" />
          <Text style={styles.menuText}>จัดการผู้ใช้งาน</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuCard}
          onPress={() => navigation.navigate('AdminMedicationMaster')}
        >
          <Ionicons name="medkit" size={40} color="#2e7d32" />
          <Text style={styles.menuText}>จัดการคลังยาหลัก</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuCard, { marginTop: 40 }]}
          onPress={() => navigation.replace('Login')}
        >
          <Ionicons name="log-out" size={30} color="#d32f2f" />
          <Text style={[styles.menuText, { color: '#d32f2f' }]}>ออกจากระบบ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#333', paddingTop: 60, paddingBottom: 30, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  content: { padding: 20, flex: 1, justifyContent: 'center' },
  menuCard: { backgroundColor: '#fff', padding: 30, borderRadius: 15, alignItems: 'center', marginBottom: 20, elevation: 3 },
  menuText: { marginTop: 15, fontSize: 18, fontWeight: 'bold', color: '#333' }
});