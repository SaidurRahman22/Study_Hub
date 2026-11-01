<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class CoreSeeder extends Seeder
{
    public function run(): void
    {
        // Staff / admin sign-in.
        User::updateOrCreate(
            ['email' => 'admin@studyhub.test'],
            [
                'name' => 'Amirul Islam',
                'role' => 'admin',
                'password' => Hash::make('password'),
            ]
        );

        // One demo student with a part-finished application.
        $student = User::updateOrCreate(
            ['email' => 'student@demo.studyhubbd.com'],
            [
                'name' => 'Nusrat Jahan',
                'role' => 'student',
                'password' => Hash::make('password'),
                'student_code' => 'SHB-2026-0184',
                'phone' => '01712-345678',
                'counsellor' => 'Rakib Hasan',
                'country' => 'United Kingdom',
                'university' => 'University of Portsmouth',
                'course' => 'MSc Computer Science',
                'intake' => 'September 2026',
            ]
        );

        if ($student->stages()->count() === 0) {
            $stages = [
                ['Counselling', 'done', '12 Feb 2026', 'Course and country agreed after two sittings.'],
                ['Documents', 'done', '03 Mar 2026', 'Transcripts, certificates and IELTS report checked in-house.'],
                ['Application sent', 'done', '21 Mar 2026', 'Submitted to Portsmouth with the SOP and one reference.'],
                ['Offer received', 'done', '22 Apr 2026', 'Unconditional offer. Deposit paid 06 May, CAS issued 19 May.'],
                ['Visa file', 'now', 'Since 20 May 2026', 'Two items left before the file can be submitted.'],
                ['Departure', 'todo', 'Expected Sep 2026', null],
            ];
            foreach ($stages as $i => [$name, $state, $date, $note]) {
                $student->stages()->create([
                    'name' => $name,
                    'state' => $state,
                    'date_label' => $date,
                    'note' => $note,
                    'position' => $i,
                ]);
            }
        }
    }
}
