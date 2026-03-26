import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import { API_URL } from '../constants/config';
import { Alert } from 'react-native';

const QUEUE_KEY = '@offline_dose_queue';
const SYMPTOM_QUEUE_KEY = '@offline_symptom_queue';

// ✅ 1. สร้างตัวแปร Lock ไว้บนสุด เพื่อป้องกันการซิงค์ชนกัน
let isSyncing = false;

// ฟังก์ชันเพิ่มคิว
export const addDoseToQueue = async (doseData) => {
  try {
    const currentQueue = await AsyncStorage.getItem(QUEUE_KEY);
    const queue = currentQueue ? JSON.parse(currentQueue) : [];
    queue.push(doseData);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    console.log("Offline dose saved to queue!");
  } catch (error) {
    console.error('Error adding to queue:', error);
  }
};

export const addSymptomToQueue = async (symptomData) => {
  try {
    const currentQueue = await AsyncStorage.getItem(SYMPTOM_QUEUE_KEY);
    const queue = currentQueue ? JSON.parse(currentQueue) : [];
    queue.push(symptomData);
    await AsyncStorage.setItem(SYMPTOM_QUEUE_KEY, JSON.stringify(queue));
    console.log("Offline symptom saved to queue!");
  } catch (error) {
    console.error('Error adding symptom to queue:', error);
  }
};

// ฟังก์ชันซิงค์ข้อมูล
export const syncOfflineQueue = async () => {
  // ✅ 2. ถ้ากำลังซิงค์อยู่ ให้ Return ออกไปเลย ไม่ต้องทำซ้ำ
  if (isSyncing) {
      console.log("กำลังซิงค์อยู่แล้ว ข้ามการทำงานซ้ำ...");
      return;
  }

  try {
    const state = await NetInfo.fetch();
    if (!state.isConnected) return; // ไม่มีเน็ต ไม่ต้องทำอะไร

    // ✅ 3. ล็อกประตู! บอกว่าเริ่มซิงค์แล้วนะ
    isSyncing = true;
    let syncMessage = "";

    // ==========================================
    // ส่วนที่ 1: ซิงค์การกินยา
    // ==========================================
    const currentQueue = await AsyncStorage.getItem(QUEUE_KEY);
    if (currentQueue) {
      const queue = JSON.parse(currentQueue);
      if (queue.length > 0) {
        console.log(`Syncing ${queue.length} offline items to server...`);
        const failedItems = [];
        
        for (const item of queue) {
          try {
            await axios.post(`${API_URL}/log-dose`, item);
          } catch (err) {
            console.error('Sync failed for item', item, err);
            failedItems.push(item);
          }
        }

        if (failedItems.length > 0) {
          await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(failedItems));
        } else {
          await AsyncStorage.removeItem(QUEUE_KEY);
          syncMessage += `💊 การกินยา (${queue.length} รายการ)\n`;
        }
      }
    }

    // ==========================================
    // ส่วนที่ 2: ซิงค์อาการป่วย
    // ==========================================
    const currentSymptomQueue = await AsyncStorage.getItem(SYMPTOM_QUEUE_KEY);
    if (currentSymptomQueue) {
        const sympQueue = JSON.parse(currentSymptomQueue);
        if (sympQueue.length > 0) {
            console.log(`Syncing ${sympQueue.length} offline symptoms to server...`);
            const failedSympItems = [];
            
            for (const item of sympQueue) {
              try {
                await axios.post(`${API_URL}/symptoms`, item);
              } catch (err) {
                console.error('Sync failed for symptom', item, err);
                failedSympItems.push(item);
              }
            }

            if (failedSympItems.length > 0) {
              await AsyncStorage.setItem(SYMPTOM_QUEUE_KEY, JSON.stringify(failedSympItems));
            } else {
              await AsyncStorage.removeItem(SYMPTOM_QUEUE_KEY);
              syncMessage += `🤒 อาการป่วย (${sympQueue.length} รายการ)\n`;
            }
        }
    }

    // แจ้งเตือนเมื่อเสร็จสิ้น
    if (syncMessage !== "") {
        Alert.alert("✅ ซิงค์ข้อมูลสำเร็จ", `ส่งข้อมูลขึ้นเซิร์ฟเวอร์เรียบร้อย:\n${syncMessage}`);
    }

  } catch (error) {
    console.error('Error syncing queue:', error);
  } finally {
    // ✅ 4. เมื่อซิงค์เสร็จ (หรือ Error ก็ตาม) ให้ "ปลดล็อก" ประตูเสมอ!
    isSyncing = false;
  }
};