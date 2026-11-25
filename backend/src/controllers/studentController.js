const bcrypt = require("bcryptjs");

const pool = require("../config/db");

const {
    createStudent,
    getAllStudents,
    getStudentById,
    getStudentByUserId,
    updateStudent,
    deleteStudent
} = require("../models/studentModel");

const validateStudentFields = ({
    registrationNo,
    firstName,
    lastName,
    email,
    phoneNumber
}) => {
    const errors = {};
    const registration = typeof registrationNo === "string"
        ? registrationNo.trim()
        : "";
    const first = typeof firstName === "string"
        ? firstName.trim()
        : "";
    const last = typeof lastName === "string"
        ? lastName.trim()
        : "";
    const emailAddress = typeof email === "string"
        ? email.trim()
        : "";
    const phone = typeof phoneNumber === "string"
        ? phoneNumber.trim()
        : "";

    if (!registration) {
        errors.registrationNo = "Registration number is required.";
    } else if (!/^[A-Za-z0-9][A-Za-z0-9_-]*(?:\/[A-Za-z0-9_-]+)*$/.test(registration)) {
        errors.registrationNo = "Registration number must contain only letters, numbers, hyphens, underscores, or slashes.";
    } else if (registration.length > 50) {
        errors.registrationNo = "Registration number must not exceed 50 characters.";
    }

    if (!first) {
        errors.firstName = "First name is required.";
    } else if (first.length < 3) {
        errors.firstName = "First name must contain at least 3 characters.";
    } else if (!/^\p{L}+$/u.test(first)) {
        errors.firstName = "First name must contain alphabetic characters only.";
    }

    if (!last) {
        errors.lastName = "Last name is required.";
    } else if (last.length < 3) {
        errors.lastName = "Last name must contain at least 3 characters.";
    } else if (!/^\p{L}+$/u.test(last)) {
        errors.lastName = "Last name must contain alphabetic characters only.";
    }

    if (!emailAddress) {
        errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailAddress)) {
        errors.email = "Enter a valid email address.";
    }

    if (!phone) {
        errors.phoneNumber = "Phone number is required.";
    } else if (!/^\d+$/.test(phone)) {
        errors.phoneNumber = "Phone number must contain numeric characters only.";
    } else if (phone.length !== 10) {
        errors.phoneNumber = "Phone number must contain exactly 10 digits.";
    }

    return {
        errors,
        values: {
            registrationNo: registration,
            firstName: first,
            lastName: last,
            email: emailAddress,
            phoneNumber: phone
        }
    };
};

const validatePassword = (password) => {
    if (typeof password !== "string" || password.length === 0) {
        return "Password is required.";
    }
    if (password.length < 8) {
        return "Password must contain at least 8 characters.";
    }
    if (!/[A-Z]/.test(password)) {
        return "Password must contain at least one uppercase letter.";
    }
    if (!/[a-z]/.test(password)) {
        return "Password must contain at least one lowercase letter.";
    }
    if (!/\d/.test(password)) {
        return "Password must contain at least one number.";
    }
    if (!/[^A-Za-z0-9\s]/.test(password)) {
        return "Password must contain at least one special character.";
    }
    return "";
};


// CREATE STUDENT
const addStudent = async (req, res) => {

    const {
        registrationNo,
        firstName,
        lastName,
        email,
        phoneNumber,
        password
    } = req.body;

    let connection;

    try {

        const validation = validateStudentFields({
            registrationNo,
            firstName,
            lastName,
            email,
            phoneNumber
        });

        const passwordError = validatePassword(password);
        if (passwordError) {
            validation.errors.password = passwordError;
        }

        if (Object.keys(validation.errors).length > 0) {
            return res.status(400).json({
                success: false,
                message: "Please correct the highlighted fields.",
                fieldErrors: validation.errors
            });
        }

        const studentData = validation.values;


        // Get database connection
        connection = await pool.getConnection();


        // Start transaction
        await connection.beginTransaction();


        // Check duplicate username
        const [existingUser] = await connection.execute(
            `SELECT user_id
             FROM users
             WHERE username = ?
             LIMIT 1`,
            [studentData.registrationNo]
        );

        if (existingUser.length > 0) {

            await connection.rollback();

            return res.status(409).json({
                success: false,
                message: "Registration number is already registered"
            });
        }


        // Check duplicate email
        const [existingStudent] = await connection.execute(
            `SELECT student_id
             FROM students
             WHERE email = ?
             LIMIT 1`,
            [studentData.email]
        );

        if (existingStudent.length > 0) {

            await connection.rollback();

            return res.status(409).json({
                success: false,
                message: "Email address is already registered"
            });
        }


        // Hash student password
        const passwordHash = await bcrypt.hash(password, 10);


        // Create user account
        const [userResult] = await connection.execute(
            `INSERT INTO users
            (
                username,
                password_hash,
                role
            )
            VALUES (?, ?, 'STUDENT')`,
            [
                studentData.registrationNo,
                passwordHash
            ]
        );

        const userId = userResult.insertId;


        // Create student profile
        const studentId = await createStudent(
            connection,
            userId,
            studentData.registrationNo,
            studentData.firstName,
            studentData.lastName,
            studentData.email,
            studentData.phoneNumber
        );


        // Commit transaction
        await connection.commit();


        // Success response
        return res.status(201).json({
            success: true,
            message: "Student account and profile created successfully",
            student: {
                studentId,
                userId,
                registrationNo: studentData.registrationNo,
                firstName: studentData.firstName,
                lastName: studentData.lastName,
                email: studentData.email,
                phoneNumber: studentData.phoneNumber,
                role: "STUDENT"
            }
        });

    } catch (error) {

        // Rollback if transaction started
        if (connection) {
            await connection.rollback();
        }

        console.error("Create student error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create student."
        });

    } finally {

        // Release connection
        if (connection) {
            connection.release();
        }
    }
};


// GET ALL STUDENTS
const getStudents = async (req, res) => {

    try {

        const students = await getAllStudents();

        return res.status(200).json({
            success: true,
            count: students.length,
            students
        });

    } catch (error) {

        console.error("Get students error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve students."
        });
    }
};


// GET STUDENT BY ID
// GET /api/students/:id
const getStudent = async (req, res) => {

    try {

        const studentId = req.params.id;

        // Validate ID
        if (!/^[1-9]\d*$/.test(studentId)) {

            return res.status(400).json({
                success: false,
                message: "Invalid student ID."
            });
        }


        const student = await getStudentById(studentId);

        if (!student) {

            return res.status(404).json({
                success: false,
                message: "Student not found."
            });
        }

        return res.status(200).json({
            success: true,
            student
        });

    } catch (error) {

        console.error("Get student error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve student."
        });
    }
};


// UPDATE STUDENT
// PUT /api/students/:id
const editStudent = async (req, res) => {

    try {

        const studentId = req.params.id;

        // Validate ID
        if (!/^[1-9]\d*$/.test(studentId)) {

            return res.status(400).json({
                success: false,
                message: "Invalid student ID."
            });
        }

        const {
            registrationNo,
            firstName,
            lastName,
            email,
            phoneNumber
        } = req.body;


        const validation = validateStudentFields({
            registrationNo,
            firstName,
            lastName,
            email,
            phoneNumber
        });

        if (Object.keys(validation.errors).length > 0) {
            return res.status(400).json({
                success: false,
                message: "Please correct the highlighted fields.",
                fieldErrors: validation.errors
            });
        }

        const studentData = validation.values;


        // Check student exists
        const existingStudent = await getStudentById(studentId);

        if (!existingStudent) {

            return res.status(404).json({
                success: false,
                message: "Student not found."
            });
        }


        // Check duplicate registration number
        const [existingUser] = await pool.execute(
            `SELECT user_id
             FROM users
             WHERE username = ?
             AND user_id != ?
             LIMIT 1`,
            [
                studentData.registrationNo,
                existingStudent.user_id
            ]
        );

        if (existingUser.length > 0) {

            return res.status(409).json({
                success: false,
                message: "Registration number is already registered."
            });
        }


        // Check duplicate email
        const [existingEmail] = await pool.execute(
            `SELECT student_id
             FROM students
             WHERE email = ?
             AND student_id != ?
             LIMIT 1`,
            [
                studentData.email,
                studentId
            ]
        );

        if (existingEmail.length > 0) {

            return res.status(409).json({
                success: false,
                message: "Email address is already registered."
            });
        }


        // Update student
        const result = await updateStudent(
            studentId,
            existingStudent.user_id,
            studentData.registrationNo,
            studentData.firstName,
            studentData.lastName,
            studentData.email,
            studentData.phoneNumber
        );


        return res.status(200).json({
            success: true,
            message: "Student updated successfully.",
            affectedRows: result.affectedRows
        });

    } catch (error) {

        console.error("Update student error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update student."
        });
    }
};


// DELETE STUDENT
// DELETE /api/students/:id
const removeStudent = async (req, res) => {

    try {

        const studentId = req.params.id;

        // Validate ID
        if (!/^[1-9]\d*$/.test(studentId)) {

            return res.status(400).json({
                success: false,
                message: "Invalid student ID."
            });
        }


        // Check student exists
        const student = await getStudentById(studentId);

        if (!student) {

            return res.status(404).json({
                success: false,
                message: "Student not found."
            });
        }


        // Delete student
        const result = await deleteStudent(studentId);

        return res.status(200).json({
            success: true,
            message: "Student deleted successfully.",
            affectedRows: result.affectedRows
        });

    } catch (error) {

        console.error("Delete student error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete student."
        });
    }
};


// GET CURRENT STUDENT'S OWN PROFILE
const getMyProfile = async (req, res) => {
    try {
        const student = await getStudentByUserId(
            req.user.userId
        );

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student profile not found."
            });
        }

        return res.status(200).json({
            success: true,
            student
        });

    } catch (error) {
        console.error("Get my profile error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve profile."
        });
    }
};


// EXPORT CONTROLLERS
module.exports = {
    addStudent,
    getStudents,
    getStudent,
    getMyProfile,
    editStudent,
    removeStudent
};
