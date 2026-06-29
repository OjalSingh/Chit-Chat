import client from "./client";

export const signup = async (data) => {
    const res = await client.post("/auth/signup", data);
    return res.data;
};

export const login = async (data) => {
    const res = await client.post("/auth/login", data);
    return res.data;
}; 

export const logout = async () => {
    const res = await client.post("/auth/logout");
    return res.data;
};

export const verify = async () => {
    const res = await client.get("/auth/verify");
    return res.data;
};

