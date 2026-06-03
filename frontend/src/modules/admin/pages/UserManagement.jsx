import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@shared/components/ui/Card';
import Button from '@shared/components/ui/Button';
import Badge from '@shared/components/ui/Badge';
import { HiOutlineUserAdd, HiOutlineArrowLeft } from 'react-icons/hi';
import { adminApi } from '../services/adminApi';

const UserManagement = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await adminApi.getUsers({ limit: 200 });
                if (res.data?.success) {
                    setUsers(res.data.result?.items || []);
                }
            } catch (error) {
                console.error("Failed to fetch users", error);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate(-1)}
                        className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-900 -ml-1.5"
                    >
                        <HiOutlineArrowLeft className="w-5 h-5" />
                    </button>
                    <h2 className="ds-h1">Platform Users</h2>
                </div>
                <Button>
                    <HiOutlineUserAdd className="mr-2 h-5 w-5" />
                    Add Internal User
                </Button>
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="ds-table-header-cell">User</th>
                                <th className="ds-table-header-cell">Role</th>
                                <th className="ds-table-header-cell">Status</th>
                                <th className="ds-table-header-cell">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-sm text-slate-500">
                                        Loading users...
                                    </td>
                                </tr>
                            ) : users.length > 0 ? (
                                users.map((user) => (
                                    <tr key={user.id || user._id}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <img 
                                                    src={user.avatar || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} 
                                                    alt="" 
                                                    className="h-9 w-9 rounded-full bg-slate-50 ring-1 ring-slate-100 object-cover mr-3" 
                                                />
                                                <div>
                                                    <p className="font-semibold text-gray-900 text-sm">{user.name}</p>
                                                    <p className="text-xs text-gray-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 uppercase">USER</td>
                                        <td className="px-6 py-4">
                                            <Badge variant={user.status === 'active' ? 'success' : 'error'}>
                                                {user.status || 'Active'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">Manage</button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-sm text-slate-500">
                                        No users found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default UserManagement;
