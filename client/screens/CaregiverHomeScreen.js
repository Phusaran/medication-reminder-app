import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

// ⚠️ เช็ค IP ให้ตรง
const API_URL = 'http://192.168.0.31:3000/api/caregiver/patients';

export default function CaregiverHomeScreen({ route, navigation }) {
  const caregiver = route.params?.caregiver; 
  const [patients, setPatients] = useState([]);

  // โหลดข้อมูลใหม่ทุกครั้งที่กลับมาหน้านี้ (เผื่อมีการเปลี่ยนรูป)
  useFocusEffect(
    useCallback(() => {
        if (caregiver) {
            fetchPatients();
        }
    }, [caregiver])
  );

  const fetchPatients = async () => {
    try {
      const response = await axios.get(`${API_URL}/${caregiver.caregiver_id}`);
      setPatients(response.data);
    } catch (error) { console.log(error); }
  };

  const handleLogout = () => navigation.replace('Login');

  const renderPatientItem = ({ item }) => (
    <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('CaregiverDashboard', { patient: item, caregiver: caregiver })}
    >
      {/* ✅✅✅ ส่วนแสดงรูปโปรไฟล์ผู้ป่วย (เหมือน ProfileScreen) ✅✅✅ */}
      <View style={styles.avatarContainer}>
          {item.profile_image ? (
              <Image source={{ uri: item.profile_image }} style={styles.avatarImage} />
          ) : (
              <View style={[styles.avatarImage, styles.placeholderAvatar]}>
                  <Ionicons name="person" size={24} color="#fff" />
              </View>
          )}
      </View>
      
      <View style={{flex: 1}}>
        <Text style={styles.name}>{item.firstname} {item.lastname}</Text>
        <Text style={styles.status}>🟢 สถานะ: ปกติ</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* --- ส่วน Header --- */}
      <View style={styles.header}>
        <View>
            <Text style={styles.greeting}>สวัสดี, คุณ{caregiver.firstname}</Text>
            <Text style={styles.subGreeting}>ผู้ป่วยในการดูแลของคุณ</Text>
        </View>

        {/* รูปโปรไฟล์ของ "ผู้ดูแล" (มุมขวาบน) */}
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <TouchableOpacity 
                onPress={() => navigation.navigate('CaregiverProfile', { caregiver: caregiver })}
                style={{ marginRight: 15 }}
            >
                {caregiver.profile_image ? (
                    <Image 
                        source={{ uri: caregiver.profile_image }} 
                        style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#fff' }} 
                    />
                ) : (
                    <Ionicons name="person-circle-outline" size={40} color="#fff" />
                )}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={30} color="#fff" />
            </TouchableOpacity>
        </View>
      </View>

      {/* --- รายชื่อผู้ป่วย --- */}
      <FlatList
        data={patients}
        keyExtractor={item => item.id.toString()}
        renderItem={renderPatientItem}
        ListEmptyComponent={<Text style={styles.empty}>ยังไม่มีผู้ป่วยในการดูแล</Text>}
        contentContainerStyle={{ padding: 20 }}
      />

      {/* ปุ่มสแกน QR */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('Scan', { caregiverId: caregiver.caregiver_id })}
      >
        <Ionicons name="qr-code-outline" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { 
      backgroundColor: '#0056b3', padding: 20, paddingTop: 50, 
      borderBottomLeftRadius: 20, borderBottomRightRadius: 20, 
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' 
  },
  greeting: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  subGreeting: { color: '#e0e0e0' },
  
  card: { 
      backgroundColor: '#fff', padding: 15, borderRadius: 15, 
      flexDirection: 'row', alignItems: 'center', marginBottom: 15, 
      elevation: 3, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity: 0.1
  },
  
  // สไตล์รูปโปรไฟล์ใน List
  avatarContainer: { marginRight: 15 },
  avatarImage: { width: 50, height: 50, borderRadius: 25 },
  placeholderAvatar: { backgroundColor: '#bbdefb', justifyContent: 'center', alignItems: 'center' },

  name: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  status: { color: 'green', marginTop: 4, fontSize: 12 },
  empty: { textAlign: 'center', marginTop: 50, color: '#999' },
  
  fab: {
    position: 'absolute', bottom: 30, right: 30,
    width: 65, height: 65, borderRadius: 35,
    backgroundColor: '#0056b3',
    justifyContent: 'center', alignItems: 'center',
    elevation: 8
  }
});