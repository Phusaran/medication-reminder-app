import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen({ route, navigation }) {
    const user = route.params?.user || { firstname: 'Guest', lastname: '', email: '-' };

    const handleLogout = () => {
        Alert.alert("ยืนยัน", "คุณต้องการออกจากระบบใช่หรือไม่?", [
            { text: "ยกเลิก", style: "cancel" },
            { text: "ตกลง", style: "destructive", onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }) }
        ]);
    };

    const lastUpdated = user.updated_at
        ? new Date(user.updated_at).toLocaleString('th-TH')
        : 'ยังไม่มีการอัปเดต';

    return (
        <ScrollView style={styles.container}>
            <View style={styles.profileHeader}>
                <View style={styles.imageContainer}>
                    {user.profile_image ? (
                        <Image source={{ uri: user.profile_image }} style={styles.profileImage} />
                    ) : (
                        <View style={styles.imagePlaceholder}><Ionicons name="person" size={50} color="#ccc" /></View>
                    )}
                    <TouchableOpacity style={styles.editBadge} onPress={() => navigation.navigate('EditProfile', { user })}>
                        <Ionicons name="camera" size={16} color="#fff" />
                    </TouchableOpacity>
                </View>

                <Text style={styles.userName}>คุณ{user.firstname} {user.lastname}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>

                {/* ❇️ ปรับปรุงให้แสดงครบ เพศ อายุ น้ำหนัก ส่วนสูง */}
                <View style={styles.statsContainer}>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>เพศ</Text>
                        <Text style={styles.statValue}>{user.gender || '-'}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>อายุ</Text>
                        <Text style={styles.statValue}>{user.age ? `${user.age} ปี` : '-'}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>น้ำหนัก</Text>
                        <Text style={styles.statValue}>{user.weight ? `${user.weight} กก.` : '-'}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>ส่วนสูง</Text>
                        <Text style={styles.statValue}>{user.height ? `${user.height} ซม.` : '-'}</Text>
                    </View>
                </View>
                <Text style={styles.updatedText}>อัปเดตล่าสุด: {lastUpdated}</Text>
            </View>

            <View style={styles.menuSection}>
                <Text style={styles.sectionTitle}>การตั้งค่าบัญชี</Text>

                <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('EditProfile', { user })}>
                    <View style={styles.menuLeft}>
                        <View style={[styles.iconBox, { backgroundColor: '#e3f2fd' }]}><Ionicons name="person-outline" size={20} color="#0056b3" /></View>
                        <Text style={styles.menuText}>แก้ไขข้อมูลส่วนตัว</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#ccc" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ManageCaregiver', { user })}>
                    <View style={styles.menuLeft}>
                        <View style={[styles.iconBox, { backgroundColor: '#f3e5f5' }]}><Ionicons name="people-outline" size={20} color="#7b1fa2" /></View>
                        <Text style={styles.menuText}>จัดการผู้ดูแล (สแกน QR Code)</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#ccc" />
                </TouchableOpacity>
            </View>

            <View style={styles.menuSection}>
                <Text style={styles.sectionTitle}>ระบบ</Text>

                <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Help')}>
                    <View style={styles.menuLeft}>
                        <View style={[styles.iconBox, { backgroundColor: '#f5f5f5' }]}><Ionicons name="help-circle-outline" size={20} color="#666" /></View>
                        <Text style={styles.menuText}>ช่วยเหลือและคำแนะนำ</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={handleLogout}>
                    <View style={styles.menuLeft}>
                        <View style={[styles.iconBox, { backgroundColor: '#ffebee' }]}><Ionicons name="log-out-outline" size={20} color="#d32f2f" /></View>
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
    profileHeader: { backgroundColor: '#fff', paddingVertical: 40, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
    imageContainer: { position: 'relative', marginBottom: 15 },
    profileImage: { width: 100, height: 100, borderRadius: 50 },
    imagePlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
    editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#0056b3', padding: 8, borderRadius: 20, borderWidth: 3, borderColor: '#fff' },
    userName: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    userEmail: { fontSize: 14, color: '#777', marginTop: 5 },
    statsContainer: { flexDirection: 'row', marginTop: 20, backgroundColor: '#fafafa', padding: 10, borderRadius: 15, width: '95%', justifyContent: 'space-evenly' },
    statBox: { alignItems: 'center', flex: 1 },
    statLabel: { fontSize: 11, color: '#888', marginBottom: 5 },
    statValue: { fontSize: 14, fontWeight: 'bold', color: '#0056b3' },
    statDivider: { width: 1, backgroundColor: '#ddd', height: '60%', alignSelf: 'center' },
    updatedText: { marginTop: 15, fontSize: 12, color: '#aaa' },
    menuSection: { backgroundColor: '#fff', marginTop: 20, paddingHorizontal: 20, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#eee' },
    sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#999', marginVertical: 15, textTransform: 'uppercase', letterSpacing: 1 },
    menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f8f8f8' },
    menuLeft: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    menuText: { fontSize: 16, color: '#333' },
    versionText: { textAlign: 'center', color: '#ccc', marginVertical: 30, fontSize: 12 },
});