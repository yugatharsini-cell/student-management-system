import { useEffect, useState } from "react";
import { LuX } from "react-icons/lu";
import { Eye, EyeOff } from "lucide-react";

import apiRequest from "../services/api";

import "../styles/studentFormModal.css";

function StudentFormModal({
    show,
    editingStudent,
    onClose,
    onSuccess,
    onAuthError
}) {

    const initialFormData = {
        registrationNo: "",
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        password: ""
    };

    const [formData, setFormData] = useState(initialFormData);

    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);

    // Reset form when editingStudent changes or modal opens
    useEffect(() => {
        if (!show) return;

        if (editingStudent) {
            setFormData({
                registrationNo: editingStudent.registration_no || "",
                firstName: editingStudent.first_name || "",
                lastName: editingStudent.last_name || "",
                email: editingStudent.email || "",
                phoneNumber: editingStudent.phone_number || "",
                password: ""
            });
        } else {

            setFormData(initialFormData);
        }

        setFormError("");
        setFieldErrors({});
    }, [editingStudent, show]);

    // Handle Input Changes
    const handleInputChange = (event) => {
        const { name, value } = event.target;

        setFormData(previous => ({
            ...previous,
            [name]: value
        }));

        setFieldErrors(previous => ({
            ...previous,
            [name]: ""
        }));
    };

    const validateForm = () => {
        const errors = {};
        const registrationNo = formData.registrationNo.trim();
        const firstName = formData.firstName.trim();
        const lastName = formData.lastName.trim();
        const email = formData.email.trim();
        const phoneNumber = formData.phoneNumber.trim();

        if (!registrationNo) {
            errors.registrationNo = "Registration number is required.";
        } else if (!/^[A-Za-z0-9][A-Za-z0-9_-]*(?:\/[A-Za-z0-9_-]+)*$/.test(registrationNo)) {
            errors.registrationNo = "Registration number must contain only letters, numbers, hyphens, underscores, or slashes.";
        } else if (registrationNo.length > 50) {
            errors.registrationNo = "Registration number must not exceed 50 characters.";
        }

        if (!firstName) {
            errors.firstName = "First name is required.";
        } else if (firstName.length < 3) {
            errors.firstName = "First name must contain at least 3 characters.";
        } else if (!/^\p{L}+$/u.test(firstName)) {
            errors.firstName = "First name must contain alphabetic characters only.";
        }

        if (!lastName) {
            errors.lastName = "Last name is required.";
        } else if (lastName.length < 3) {
            errors.lastName = "Last name must contain at least 3 characters.";
        } else if (!/^\p{L}+$/u.test(lastName)) {
            errors.lastName = "Last name must contain alphabetic characters only.";
        }

        if (!email) {
            errors.email = "Email address is required.";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
            errors.email = "Enter a valid email address.";
        }

        if (!phoneNumber) {
            errors.phoneNumber = "Phone number is required.";
        } else if (!/^\d+$/.test(phoneNumber)) {
            errors.phoneNumber = "Phone number must contain numeric characters only.";
        } else if (phoneNumber.length !== 10) {
            errors.phoneNumber = "Phone number must contain exactly 10 digits.";
        }

        if (!editingStudent) {
            const password = formData.password;

            if (!password) {
                errors.password = "Password is required.";
            } else if (password.length < 8) {
                errors.password = "Password must contain at least 8 characters.";
            } else if (!/[A-Z]/.test(password)) {
                errors.password = "Password must contain at least one uppercase letter.";
            } else if (!/[a-z]/.test(password)) {
                errors.password = "Password must contain at least one lowercase letter.";
            } else if (!/\d/.test(password)) {
                errors.password = "Password must contain at least one number.";
            } else if (!/[^A-Za-z0-9\s]/.test(password)) {
                errors.password = "Password must contain at least one special character.";
            }
        }

        return errors;
    };


    // Handle Close
    const handleClose = () => {
        if (formLoading) return;
        setFormError("");
        setFieldErrors({});
        setShowPassword(false);
        onClose();
    };


    // Handle Form Submission
    const handleSubmit = async (event) => {
        event.preventDefault();

        setFormError("");
        setFieldErrors({});

        const errors = validateForm();

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            setFormError("Please correct the highlighted fields.");
            return;
        }

        try {
            setFormLoading(true);

            if (editingStudent) {
                await apiRequest(
                    `/api/students/${editingStudent.student_id}`,
                    {
                        method: "PUT",
                        body: JSON.stringify({
                            registrationNo: formData.registrationNo.trim(),
                            firstName: formData.firstName.trim(),
                            lastName: formData.lastName.trim(),
                            email: formData.email.trim(),
                            phoneNumber: formData.phoneNumber.trim()
                        })
                    }
                );
            } else {
                await apiRequest(
                    "/api/students/",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            registrationNo: formData.registrationNo.trim(),
                            firstName: formData.firstName.trim(),
                            lastName: formData.lastName.trim(),
                            email: formData.email.trim(),
                            phoneNumber: formData.phoneNumber.trim(),
                            password: formData.password
                        })
                    }
                );
            }

            onSuccess();
            handleClose();

        } catch (error) {
            console.error("Student save error:", error);

            if (error.status === 401) {
                onAuthError();
                return;
            }

            if (error.status === 403) {
                setFormError(
                    "You do not have permission to modify students."
                );
                return;
            }

            if (error.data?.fieldErrors) {
                setFieldErrors(error.data.fieldErrors);
                setFormError(
                    error.message || "Please correct the highlighted fields."
                );
                return;
            }

            setFormError(
                error.message || "Failed to save student."
            );

        } finally {
            setFormLoading(false);
        }
    };


    if (!show) return null;


    // Reusable Input Field
    const renderInput = (name, label, type = "text") => (

        <div className="form-group">

            <label htmlFor={name}>
                {label}
            </label>

            <input
                id={name}
                type={type}
                name={name}
                value={formData[name]}
                onChange={handleInputChange}
                disabled={formLoading}
                required
                {...(name === "phoneNumber"
                    ? { inputMode: "numeric" }
                    : {})}
                aria-invalid={Boolean(fieldErrors[name])}
                aria-describedby={
                    fieldErrors[name] ? `${name}-error` : undefined
                }
            />

            {fieldErrors[name] && (
                <span
                    id={`${name}-error`}
                    className="field-error"
                >
                    {fieldErrors[name]}
                </span>
            )}

        </div>
    );


    // Component UI
    return (

        <div
            className="modal-overlay"
            onClick={handleClose}
        >

            <div
                className="modal-content student-form-card"
                onClick={(e) => e.stopPropagation()}
            >

                <div className="form-card-header">

                    <div>
                        <h3>
                            {editingStudent
                                ? "Edit Student"
                                : "Add New Student"
                            }
                        </h3>

                        <p>
                            {editingStudent
                                ? "Update student information."
                                : "Create a new student account."
                            }
                        </p>
                    </div>

                    <button
                        type="button"
                        className="close-form-button"
                        onClick={handleClose}
                        disabled={formLoading}
                        aria-label="Close"
                    >
                        <LuX size={20} />
                    </button>

                </div>


                {formError && (
                    <div className="dashboard-error">
                        {formError}
                    </div>
                )}


                <form
                    className="student-form"
                    onSubmit={handleSubmit}
                >

                    {renderInput(
                        "registrationNo",
                        "Registration Number"
                    )}

                    {renderInput(
                        "firstName",
                        "First Name"
                    )}

                    {renderInput(
                        "lastName",
                        "Last Name"
                    )}

                    {renderInput(
                        "email",
                        "Email",
                        "email"
                    )}

                    {renderInput(
                        "phoneNumber",
                        "Phone Number"
                    )}


                    {!editingStudent && (
                        <div className="form-group">

                            <label htmlFor="password">
                                Password
                            </label>

                            <div className="student-password-input-wrapper">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    disabled={formLoading}
                                    required
                                    aria-invalid={Boolean(fieldErrors.password)}
                                    aria-describedby={
                                        fieldErrors.password
                                            ? "password-error"
                                            : "password-policy"
                                    }
                                />

                                <button
                                    type="button"
                                    className="student-password-toggle-button"
                                    onClick={() =>
                                        setShowPassword((isVisible) => !isVisible)
                                    }
                                    aria-label={
                                        showPassword
                                            ? "Hide password"
                                            : "Show password"
                                    }
                                    aria-pressed={showPassword}
                                    disabled={formLoading}
                                >
                                    {showPassword
                                        ? <EyeOff aria-hidden="true" />
                                        : <Eye aria-hidden="true" />
                                    }
                                </button>
                            </div>
                            {fieldErrors.password && (
                                <span
                                    id="password-error"
                                    className="field-error"
                                >
                                    {fieldErrors.password}
                                </span>
                            )}
                            <small id="password-policy" className="field-hint">
                                8+ characters with uppercase, lowercase, number,
                                and special character.
                            </small>
                        </div>
                    )}


                    <div className="form-actions">

                        <button
                            type="button"
                            className="cancel-button"
                            onClick={handleClose}
                            disabled={formLoading}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="save-button"
                            disabled={formLoading}
                        >
                            {formLoading
                                ? "Saving..."
                                : editingStudent
                                    ? "Update Student"
                                    : "Create Student"
                            }
                        </button>

                    </div>

                </form>

            </div>
        </div>
    );
}

export default StudentFormModal;