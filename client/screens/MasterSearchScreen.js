import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Image } from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
// ✅ Import Config
import { API_URL } from '../constants/config';

export default function MasterSearchScreen({ navigation, route }) {
  const { user } = route.params;
  const [search, setSearch] = useState('');
  const [masterMeds, setMasterMeds] = useState([]);

  useEffect(() => {
    fetchMasterMeds();
  }, [search]);

  const fetchMasterMeds = async () => {
    try {
      // ✅ แก้ Path
      const response = await axios.get(`${API_URL}/master-medications?query=${search}`);
      setMasterMeds(response.data);
    } catch (error) { console.log(error); }
  };

  const handleSelect = (item) => {
      navigation.navigate('AddMedication', { 
          user: user,
          prefilledData: {
              name: item.generic_name,
              instruction: item.description,
              unit: item.dosage_unit,
              image: item.image_url
          }
      });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>เลือกยาจากคลังหลัก</Text>
          <View style={{width: 28}} />
      </View>

      <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#666" style={{marginRight: 10}} />
          <TextInput placeholder="ค้นหาชื่อยา หรือ สรรพคุณ..." style={{flex: 1}} value={search} onChangeText={setSearch} />
      </View>

      <FlatList 
          data={masterMeds}
          keyExtractor={item => item.med_id.toString()}
          contentContainerStyle={{padding: 20}}
          renderItem={({ item }) => (
              <TouchableOpacity style={styles.card} onPress={() => handleSelect(item)}>
                  <Image source={{ uri: item.image_url }} style={styles.image} />
                  <View style={{flex: 1}}>
                      <Text style={styles.medName}>{item.generic_name}</Text>
                      <Text style={styles.medDesc}>{item.description}</Text>
                      <View style={styles.badge}><Text style={styles.badgeText}>{item.drug_type}</Text></View>
                  </View>
                  <Ionicons name="add-circle-outline" size={28} color="#0056b3" />
              </TouchableOpacity>
          )}
      />
      
      <TouchableOpacity style={styles.skipButton} onPress={() => navigation.navigate('AddMedication', { user: user })}>
          <Text style={styles.skipText}>หาไม่เจอ? เพิ่มยาเองด้วยมือ</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: 'bold' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 15, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#ddd' },
  card: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, alignItems: 'center', elevation: 2 },
  image: { width: 50, height: 50, borderRadius: 25, marginRight: 15, backgroundColor: '#eee' },
  medName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  medDesc: { fontSize: 12, color: '#666', marginTop: 2 },
  badge: { backgroundColor: '#e3f2fd', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5, marginTop: 5 },
  badgeText: { fontSize: 10, color: '#0056b3' },
  skipButton: { alignItems: 'center', padding: 20 },
  skipText: { color: '#0056b3', fontWeight: 'bold', textDecorationLine: 'underline' }
});