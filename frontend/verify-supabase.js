
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yfhrpzndcrbpnrvklkhw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmaHJwem5kY3JicG5ydmxraGh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MzA5NDIsImV4cCI6MjA4MzAwNjk0Mn0.auWEN0Pjoc_NNZbzsyyTyklqX_MkqpGeM5T7B5WtEfA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log('Testing Supabase connection...');
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: 'test@example.com',
            password: 'wrongpassword123',
        });

        if (error) {
            console.log('Supabase Error:', error.message);
            if (error.status === 400 || error.message.includes('Invalid login credentials')) {
                console.log('SUCCESS: Connection established (Invalid credentials expected).');
            } else {
                console.log('FAILURE: Unexpected error.', error);
            }
        } else {
            console.log('SUCCESS: Connected (Unexpectedly logged in?)', data);
        }
    } catch (err) {
        console.error('EXCEPTION:', err);
    }
}

testConnection();
