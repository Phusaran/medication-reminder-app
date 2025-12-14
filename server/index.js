require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer'); 
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// ⚙️ ตั้งค่าระบบอัปโหลด (Multer) & โฟลเดอร์
// ==========================================

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir); 
}
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// ==========================================
// 🗄️ ตั้งค่า Database
// ==========================================
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'medication_reminder'
});

db.getConnection()
    .then(() => console.log('✅ Connected to database: medication_reminder'))
    .catch((err) => console.error('❌ Database connection failed:', err.message));

// ==========================================
// 📸 API อัปโหลดรูปภาพ
// ==========================================
app.post('/api/upload', upload.single('profileImage'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'กรุณาเลือกรูปภาพ' });
    }
    const protocol = req.protocol;
    const host = req.get('host'); 
    const fullUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    
    res.json({ url: fullUrl });
});

// ==========================================
// 1. ส่วน User (Authen)
// ==========================================

app.post('/api/register', async (req, res) => {
    const { email, password, firstname, lastname } = req.body;
    try {
        const [existingUser] = await db.query('SELECT * FROM user WHERE email = ?', [email]); 
        if (existingUser.length > 0) return res.status(400).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const invite_code = Math.random().toString(36).substring(2, 8).toUpperCase();

        await db.query(
            'INSERT INTO user (email, password, firstname, lastname, invite_code) VALUES (?, ?, ?, ?, ?)',
            [email, hashedPassword, firstname, lastname, invite_code]
        );
        res.status(201).json({ message: 'สมัครสมาชิกเรียบร้อยแล้ว' });
    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสมัครสมาชิก' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await db.query('SELECT * FROM user WHERE email = ?', [email]);
        if (rows.length === 0) return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });

        res.json(user);
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการล็อกอิน' });
    }
});

app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { firstname, lastname, password, profile_image } = req.body;

    try {
        let query = 'UPDATE user SET firstname = ?, lastname = ?';
        let params = [firstname, lastname];

        if (profile_image) {
            query += ', profile_image = ?';
            params.push(profile_image);
        }

        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            query += ', password = ?';
            params.push(hashedPassword);
        }

        query += ' WHERE user_id = ?';
        params.push(id);

        await db.query(query, params);
        const [updatedUsers] = await db.query('SELECT * FROM user WHERE user_id = ?', [id]);
        res.json(updatedUsers[0]);

    } catch (error) {
        console.error("Update Profile Error:", error);
        res.status(500).json({ message: 'Error updating profile' });
    }
});

// ==========================================
// 2. ส่วนยา (Medications)
// ==========================================

// ดึงรายการยาของ User
app.get('/api/medications/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT 
                m.user_med_id, m.custom_name, m.instruction, m.dosage_unit, m.disease_group,
                m.custom_image AS image_url, 
                s.current_quantity,
                sch.schedule_id, sch.time_to_take, sch.days_of_week, sch.dosage_amount
            FROM User_Medication m
            JOIN Stock s ON m.user_med_id = s.user_med_id
            LEFT JOIN Schedule sch ON m.user_med_id = sch.user_med_id
            WHERE m.user_id = ?
        `, [userId]);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching medications' });
    }
});

// ดึงรายชื่อกลุ่มโรค (Disease Groups)
app.get('/api/disease-groups/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT DISTINCT disease_group 
            FROM User_Medication 
            WHERE user_id = ? AND disease_group IS NOT NULL AND disease_group != ''
        `, [userId]);
        const groups = rows.map(r => r.disease_group);
        res.json(groups);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching groups' });
    }
});

// ค้นหายาจาก Master
app.get('/api/master-medications', async (req, res) => {
    const { query } = req.query; 
    try {
        let sql = 'SELECT * FROM medication_master';
        let params = [];

        if (query) {
            sql += ' WHERE generic_name LIKE ? OR description LIKE ?';
            params.push(`%${query}%`, `%${query}%`);
        }

        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching master medications' });
    }
});

// เพิ่มยาใหม่ (POST)
app.post('/api/medications', async (req, res) => {
    const { 
        user_id, custom_name, instruction, dosage_unit, image_url, 
        initial_quantity, notify_threshold, days_of_week, dosage_amount,
        intake_timing, start_date, end_date, times,
        disease_group, 
        drug_type // 👈 รับค่านี้เพิ่ม
    } = req.body;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [medResult] = await connection.query(
            `INSERT INTO User_Medication 
            (user_id, custom_name, disease_group, drug_type, instruction, dosage_unit, custom_image, intake_timing, start_date, end_date) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, // เพิ่ม ? อีก 1 ตัว
            [user_id, custom_name, disease_group, drug_type, instruction, dosage_unit, image_url, intake_timing, start_date, end_date]
        );
        const medId = medResult.insertId;

        // ... (ส่วน Insert Stock และ Schedule เหมือนเดิม) ...
        await connection.query(
            `INSERT INTO Stock (user_med_id, current_quantity, notify_threshold) VALUES (?, ?, ?)`,
            [medId, initial_quantity, notify_threshold]
        );

        if (Array.isArray(times) && times.length > 0) {
            for (const timeStr of times) {
                await connection.query(
                    `INSERT INTO Schedule (user_med_id, time_to_take, days_of_week, dosage_amount) VALUES (?, ?, ?, ?)`,
                    [medId, timeStr, days_of_week, dosage_amount]
                );
            }
        }

        await connection.commit();
        res.status(201).json({ message: 'เพิ่มยาเรียบร้อยแล้ว!', med_id: medId });

    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ message: 'Error adding medication' });
    } finally {
        connection.release();
    }
});

// ดึงตารางเวลาของยา 1 ตัว (สำหรับหน้าแก้ไข)
app.put('/api/medications/:medId', async (req, res) => {
    const { medId } = req.params;
    const { 
        custom_name, instruction, dosage_unit, image_url, 
        initial_quantity, notify_threshold, intake_timing, start_date, end_date, times,
        disease_group,
        drug_type // 👈 รับค่านี้เพิ่ม
    } = req.body;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        let updateQuery = `
            UPDATE User_Medication 
            SET custom_name=?, disease_group=?, drug_type=?, instruction=?, dosage_unit=?, intake_timing=?, start_date=?, end_date=?
        `;
        const params = [custom_name, disease_group, drug_type, instruction, dosage_unit, intake_timing, start_date, end_date];

        if (image_url) {
            updateQuery += `, custom_image=?`;
            params.push(image_url);
        }
        updateQuery += ` WHERE user_med_id=?`;
        params.push(medId);

        await connection.query(updateQuery, params);

        // ... (ส่วน update Stock และ Schedule เหมือนเดิม) ...
        await connection.query(
            `UPDATE Stock SET current_quantity=?, notify_threshold=? WHERE user_med_id=?`,
            [initial_quantity, notify_threshold, medId]
        );

        if (Array.isArray(times) && times.length > 0) {
            await connection.query('DELETE FROM Schedule WHERE user_med_id = ?', [medId]);
            for (const timeStr of times) {
                await connection.query(
                    `INSERT INTO Schedule (user_med_id, time_to_take, days_of_week, dosage_amount) VALUES (?, ?, ?, ?)`,
                    [medId, timeStr, 'Everyday', 1]
                );
            }
        }

        await connection.commit();
        res.json({ message: 'แก้ไขข้อมูลเรียบร้อย' });

    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ message: 'Error updating medication' });
    } finally {
        connection.release();
    }
});

// แก้ไขยา (PUT)
app.put('/api/medications/:medId', async (req, res) => {
    const { medId } = req.params;
    const { 
        custom_name, instruction, dosage_unit, image_url, 
        initial_quantity, notify_threshold, intake_timing, start_date, end_date, times,
        disease_group 
    } = req.body;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        let updateQuery = `
            UPDATE User_Medication 
            SET custom_name=?, disease_group=?, instruction=?, dosage_unit=?, intake_timing=?, start_date=?, end_date=?
        `;
        const params = [custom_name, disease_group, instruction, dosage_unit, intake_timing, start_date, end_date];

        if (image_url) {
            updateQuery += `, custom_image=?`;
            params.push(image_url);
        }
        updateQuery += ` WHERE user_med_id=?`;
        params.push(medId);

        await connection.query(updateQuery, params);

        await connection.query(
            `UPDATE Stock SET current_quantity=?, notify_threshold=? WHERE user_med_id=?`,
            [initial_quantity, notify_threshold, medId]
        );

        if (Array.isArray(times) && times.length > 0) {
            await connection.query('DELETE FROM Schedule WHERE user_med_id = ?', [medId]);
            for (const timeStr of times) {
                await connection.query(
                    `INSERT INTO Schedule (user_med_id, time_to_take, days_of_week, dosage_amount) VALUES (?, ?, ?, ?)`,
                    [medId, timeStr, 'Everyday', 1]
                );
            }
        }

        await connection.commit();
        res.json({ message: 'แก้ไขข้อมูลเรียบร้อย' });

    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ message: 'Error updating medication' });
    } finally {
        connection.release();
    }
});

// ลบยา (DELETE)
app.delete('/api/medications/:medId', async (req, res) => {
    const { medId } = req.params;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        // ลบข้อมูลที่เกี่ยวข้องทั้งหมดก่อน
        await connection.query(`
            DELETE ml FROM Medication_Log ml
            JOIN Schedule s ON ml.schedule_id = s.schedule_id
            WHERE s.user_med_id = ?
        `, [medId]);

        await connection.query('DELETE FROM Schedule WHERE user_med_id = ?', [medId]);
        await connection.query('DELETE FROM Stock WHERE user_med_id = ?', [medId]);
        await connection.query('DELETE FROM User_Medication WHERE user_med_id = ?', [medId]);

        await connection.commit();
        res.json({ message: 'ลบข้อมูลเรียบร้อย' });

    } catch (error) {
        await connection.rollback();
        console.error("Delete Error:", error);
        res.status(500).json({ message: 'Error deleting medication', error: error.message });
    } finally {
        connection.release();
    }
});

// ==========================================
// 3. ส่วนการกินยา (Log Dose)
// ==========================================

app.post('/api/log-dose', async (req, res) => {
    const { schedule_id, status } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        await connection.query(
            `INSERT INTO Medication_Log (schedule_id, status, taken_at) VALUES (?, ?, NOW())`,
            [schedule_id, status]
        );

        if (status === 'taken') {
            const [scheduleRows] = await connection.query(
                'SELECT dosage_amount, user_med_id FROM Schedule WHERE schedule_id = ?', 
                [schedule_id]
            );

            if (scheduleRows.length > 0) {
                const dosage = scheduleRows[0].dosage_amount;
                const medId = scheduleRows[0].user_med_id;
                
                // 1. ตัดสต็อก (ป้องกันติดลบ) -> อันนี้มีแล้ว ดีครับ
                await connection.query(
                    'UPDATE Stock SET current_quantity = GREATEST(current_quantity - ?, 0) WHERE user_med_id = ?',
                    [dosage, medId]
                );

                // ✅ 2. (เพิ่มส่วนนี้) เช็คว่าต้องเตือนไหม?
                const [stockRows] = await connection.query(
                    'SELECT current_quantity, notify_threshold FROM Stock WHERE user_med_id = ?',
                    [medId]
                );

                let alertMessage = null;
                if (stockRows.length > 0) {
                    const { current_quantity, notify_threshold } = stockRows[0];
                    // ถ้าเหลือน้อยกว่าหรือเท่ากับเกณฑ์ และยังไม่หมด (ถ้าหมดจะเตือนอีกแบบหรือปิดปุ่ม)
                    if (current_quantity <= notify_threshold && current_quantity > 0) {
                        alertMessage = `⚠️ ยาใกล้หมด! เหลือเพียง ${current_quantity} หน่วย`;
                    } else if (current_quantity === 0) {
                        alertMessage = `❌ ยาหมดแล้ว! กรุณาเติมยา`;
                    }
                }

                await connection.commit();
                // ส่ง alert กลับไป
                res.json({ message: 'บันทึกเรียบร้อย', alert: alertMessage }); 
                return;
            }
        }
        await connection.commit();
        res.json({ message: 'บันทึกเรียบร้อย' });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ message: 'Error logging dose' });
    } finally {
        connection.release();
    }
});

// ==========================================
// 4. ส่วนประวัติ & อาการ
// ==========================================

app.get('/api/history/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT 
                ml.med_log_id, ml.status, ml.taken_at,
                um.custom_name, s.dosage_amount, um.dosage_unit,
                s.time_to_take  
            FROM Medication_Log ml
            JOIN Schedule s ON ml.schedule_id = s.schedule_id
            JOIN User_Medication um ON s.user_med_id = um.user_med_id
            WHERE um.user_id = ?
            ORDER BY ml.taken_at DESC
        `, [userId]);
        res.json(rows);
    } catch (error) {
        console.error("Fetch History Error:", error);
        res.status(500).json({ message: 'Error fetching history' });
    }
});

app.post('/api/symptoms', async (req, res) => {
    const { user_id, symptom_name, description, severity } = req.body;
    try {
        await db.query(
            `INSERT INTO Symptom_Log (user_id, symptom_name, description, severity, log_timestamp) 
             VALUES (?, ?, ?, ?, NOW())`,
            [user_id, symptom_name, description, severity]
        );
        res.status(201).json({ message: 'บันทึกอาการเรียบร้อย' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error saving symptom' });
    }
});

app.get('/api/symptoms/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [rows] = await db.query(
            `SELECT * FROM Symptom_Log WHERE user_id = ? ORDER BY log_timestamp DESC`,
            [userId]
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching symptoms' });
    }
});

// ==========================================
// 5. ส่วนผู้ดูแล (Caregiver)
// ==========================================

app.post('/api/caregiver/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await db.query('SELECT * FROM Caregiver WHERE email = ?', [email]);
        if (rows.length === 0) return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });

        const caregiver = rows[0];
        const isMatch = await bcrypt.compare(password, caregiver.password);
        if (!isMatch) return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });

        res.json(caregiver);
    } catch (error) {
        console.error("Caregiver Login Error:", error);
        res.status(500).json({ message: 'Error logging in' });
    }
});

app.get('/api/caregivers/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT c.caring_id, c.granted_date, cg.firstname, cg.lastname, cg.email
            FROM Caring c
            JOIN Caregiver cg ON c.caregiver_id = cg.caregiver_id
            WHERE c.user_id = ?
        `, [userId]);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching caregivers' });
    }
});

app.post('/api/caregivers/invite', async (req, res) => {
    const { user_id, email } = req.body;
    try {
        const [caregivers] = await db.query('SELECT caregiver_id FROM Caregiver WHERE email = ?', [email]);
        
        if (caregivers.length === 0) {
            return res.status(404).json({ message: 'ไม่พบผู้ดูแลที่มีอีเมลนี้ในระบบ' });
        }

        const caregiverId = caregivers[0].caregiver_id;
        const [existing] = await db.query(
            'SELECT * FROM Caring WHERE user_id = ? AND caregiver_id = ?', 
            [user_id, caregiverId]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: 'คุณได้เพิ่มผู้ดูแลคนนี้ไปแล้ว' });
        }

        await db.query(
            'INSERT INTO Caring (user_id, caregiver_id, status, granted_date) VALUES (?, ?, ?, NOW())',
            [user_id, caregiverId, 'active']
        );

        res.status(201).json({ message: 'เพิ่มผู้ดูแลเรียบร้อยแล้ว' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error inviting caregiver' });
    }
});

app.delete('/api/caregivers/:caringId', async (req, res) => {
    const { caringId } = req.params;
    try {
        await db.query('DELETE FROM Caring WHERE caring_id = ?', [caringId]);
        res.json({ message: 'ลบผู้ดูแลเรียบร้อย' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error removing caregiver' });
    }
});

app.put('/api/caregivers/:id', async (req, res) => {
    const { id } = req.params;
    const { firstname, lastname, password, profile_image } = req.body; 

    try {
        let query = 'UPDATE Caregiver SET firstname = ?, lastname = ?';
        let params = [firstname, lastname];

        if (profile_image) {
            query += ', profile_image = ?';
            params.push(profile_image);
        }

        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            query += ', password = ?';
            params.push(hashedPassword);
        }

        query += ' WHERE caregiver_id = ?';
        params.push(id);

        await db.query(query, params);

        const [updated] = await db.query('SELECT * FROM Caregiver WHERE caregiver_id = ?', [id]);
        res.json(updated[0]);

    } catch (error) {
        console.error("Update Caregiver Error:", error);
        res.status(500).json({ message: 'Error updating caregiver profile' });
    }
});

app.get('/api/caregiver/patients/:caregiverId', async (req, res) => {
    const { caregiverId } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT u.user_id AS id, u.firstname, u.lastname, u.email, u.profile_image
            FROM Caring c
            JOIN user u ON c.user_id = u.user_id
            WHERE c.caregiver_id = ? AND c.status = 'active'
        `, [caregiverId]);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching patients' });
    }
});

app.get('/api/caregiver/patient/:userId/dashboard', async (req, res) => {
    const { userId } = req.params;
    try {
        const [logs] = await db.query(`
            SELECT ml.status, ml.taken_at, um.custom_name, s.time_to_take
            FROM Medication_Log ml
            JOIN Schedule s ON ml.schedule_id = s.schedule_id
            JOIN User_Medication um ON s.user_med_id = um.user_med_id
            WHERE um.user_id = ? AND DATE(ml.taken_at) = CURDATE()
            ORDER BY ml.taken_at DESC
        `, [userId]);

        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'taken' THEN 1 ELSE 0 END) as taken
            FROM Medication_Log ml
            JOIN Schedule s ON ml.schedule_id = s.schedule_id
            JOIN User_Medication um ON s.user_med_id = um.user_med_id
            WHERE um.user_id = ? AND MONTH(ml.taken_at) = MONTH(CURDATE())
        `, [userId]);

        const total = stats[0].total || 1;
        const taken = stats[0].taken || 0;
        const percentage = Math.round((taken / total) * 100);

        res.json({ logs: logs, percentage: percentage });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching dashboard' });
    }
});

app.post('/api/caregivers/link-qr', async (req, res) => {
    const { caregiver_id, invite_code } = req.body;
    try {
        const [users] = await db.query('SELECT user_id FROM user WHERE invite_code = ?', [invite_code]);
        
        if (users.length === 0) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน (QR Code ไม่ถูกต้อง)' });
        }

        const targetUserId = users[0].user_id; 

        const [existing] = await db.query(
            'SELECT * FROM Caring WHERE user_id = ? AND caregiver_id = ?', 
            [targetUserId, caregiver_id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: 'คุณดูแลผู้ป่วยคนนี้อยู่แล้ว' });
        }

        await db.query(
            'INSERT INTO Caring (user_id, caregiver_id, status, granted_date) VALUES (?, ?, ?, NOW())',
            [targetUserId, caregiver_id, 'active']
        );

        res.status(201).json({ message: 'เพิ่มผู้ป่วยเรียบร้อยแล้ว' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error linking caregiver' });
    }
});

// ==========================================
// 6. ส่วน Admin
// ==========================================

app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.query('SELECT * FROM Admin WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(401).json({ message: 'Username ไม่ถูกต้อง' });

        const admin = rows[0];
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });

        res.json(admin);
    } catch (error) {
        console.error("Admin Login Error:", error);
        res.status(500).json({ message: 'Error logging in' });
    }
});

app.get('/api/admin/users', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT user_id AS id, firstname, lastname, email FROM user');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching users' });
    }
});

app.delete('/api/admin/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM user WHERE user_id = ?', [id]);
        res.json({ message: 'ลบผู้ใช้งานเรียบร้อย' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting user' });
    }
});

app.get('/api/admin/medications', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM Medication_Master');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching master medications' });
    }
});

app.post('/api/admin/medications', async (req, res) => {
    const { generic_name, description, dosage_unit } = req.body;
    try {
        await db.query(
            'INSERT INTO Medication_Master (generic_name, description, dosage_unit) VALUES (?, ?, ?)',
            [generic_name, description, dosage_unit]
        );
        res.status(201).json({ message: 'เพิ่มยาเข้าคลังหลักเรียบร้อย' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding master medication' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});