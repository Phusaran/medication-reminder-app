import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen({ route, navigation }) {
  // รับข้อมูล user จาก params
  const user = route.params?.user || { 
    firstname: 'Guest', 
    lastname: '', 
    email: '-', 
  };

  const handleLogout = () => {
    Alert.alert("ยืนยัน", "คุณต้องการออกจากระบบใช่หรือไม่?", [
      { text: "ยกเลิก", style: "cancel" },
      { 
        text: "ตกลง", 
        style: "destructive",
        onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }) 
      }
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* ส่วนหัวโปรไฟล์: เน้นความสะอาดและดูง่าย */}
      <View style={styles.profileHeader}>
        <View style={styles.imageContainer}>
          {user.profile_image ? (
            <Image source={{ uri: user.profile_image }} style={styles.profileImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="person" size={50} color="#ccc" />
            </View>
          )}
          <TouchableOpacity 
            style={styles.editBadge}
            onPress={() => navigation.navigate('EditProfile', { user })}
          >
            <Ionicons name="camera" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.userName}>คุณ{user.firstname} {user.lastname}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
      </View>

      {/* ส่วนเมนูจัดการ: แบ่งหมวดหมู่ให้ชัดเจน */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>การตั้งค่าบัญชี</Text>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('EditProfile', { user })}
        >
          <View style={styles.menuLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#e3f2fd' }]}>
              <Ionicons name="person-outline" size={20} color="#0056b3" />
            </View>
            <Text style={styles.menuText}>แก้ไขข้อมูลส่วนตัว</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('ManageCaregiver', { user })}
        >
          <View style={styles.menuLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#f3e5f5' }]}>
              <Ionicons name="people-outline" size={20} color="#7b1fa2" />
            </View>
            <Text style={styles.menuText}>จัดการผู้ดูแล (สแกน QR Code)</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#ccc" />
        </TouchableOpacity>
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>ระบบ</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Help')}>
          <View style={styles.menuLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#f5f5f5' }]}>
              <Ionicons name="help-circle-outline" size={20} color="#666" />
            </View>
            <Text style={styles.menuText}>ช่วยเหลือและคำแนะนำ</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuItem, { borderBottomWidth: 0 }]} 
          onPress={handleLogout}
        >
          <View style={styles.menuLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#ffebee' }]}>
              <Ionicons name="log-out-outline" size={20} color="#d32f2f" />
            </View>
            <Text style={[styles.menuText, { color: '#d32f2f' }]}>ออกจากระบบ</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.versionText}>Version 1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  profileHeader: {
    backgroundColor: '#fff',
    paddingVertical: 40,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  imageContainer: { position: 'relative', marginBottom: 15 },
  profileImage: { width: 100, height: 100, borderRadius: 50 },
  imagePlaceholder: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    backgroundColor: '#f0f0f0', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee'
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0056b3',
    padding: 8,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#fff'
  },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  userEmail: { fontSize: 14, color: '#777', marginTop: 5 },
  menuSection: { 
    backgroundColor: '#fff', 
    marginTop: 20, 
    paddingHorizontal: 20, 
    borderTopWidth: 1, 
    borderBottomWidth: 1, 
    borderColor: '#eee' 
  },
  sectionTitle: { 
    fontSize: 12, 
    fontWeight: 'bold', 
    color: '#999', 
    marginVertical: 15, 
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  menuItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f8f8f8' 
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  menuText: { fontSize: 16, color: '#333' },
  versionText: { textAlign: 'center', color: '#ccc', marginVertical: 30, fontSize: 12 },
});