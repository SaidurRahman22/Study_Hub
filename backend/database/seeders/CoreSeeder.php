<?php

namespace Database\Seeders;

use App\Models\Announcement;
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

        // The documents the office is tracking. No files are attached: a real
        // file only exists once someone uploads one, and inventing them would
        // make the screens lie about what is on the disk.
        if ($student->documents()->count() === 0) {
            $documents = [
                ['Passport, bio page', 'application', 'accepted', 'Original seen in the office on 03 Mar.'],
                ['Academic transcripts', 'application', 'accepted', 'Checked against the originals in-house.'],
                ['IELTS test report form', 'application', 'accepted', 'Overall 7.0, no band below 6.5.'],
                ['Statement of purpose', 'application', 'accepted', 'Final version sent with the application.'],
                ['Bank statement, 28 days', 'visa', 'needed', 'Must cover the full 28 days and end within 31 days of the application.'],
                ['Bank solvency certificate', 'visa', 'needed', 'Ask the branch for it on bank letterhead, signed and dated.'],
                ['Tuberculosis test certificate', 'visa', 'review', 'Sent to the office, being checked against the UKVI clinic list.'],
                ['CAS statement', 'visa', 'accepted', 'Issued 19 May 2026.'],
                ['Police clearance certificate', 'visa', 'later', 'Not needed for this course and country.'],
            ];
            foreach ($documents as [$name, $group, $status, $note]) {
                $student->documents()->create([
                    'name' => $name,
                    'group' => $group,
                    'status' => $status,
                    'note' => $note,
                ]);
            }
        }

        // A short thread, so the messages screen is not empty on a fresh
        // install. Written the way the office actually writes.
        if ($student->messages()->count() === 0) {
            $thread = [
                ['agency', 'Rakib Hasan', 'Your offer from Portsmouth is unconditional. Pay the deposit by 06 May and we will ask for the CAS the same week.'],
                ['student', $student->name, 'Deposit paid this morning. I have the receipt from the bank.'],
                ['agency', 'Rakib Hasan', 'Received, thank you. The CAS came through on 19 May. Two items are left on the visa file: the 28 day bank statement and the solvency certificate.'],
            ];
            foreach ($thread as $i => [$sender, $author, $body]) {
                $student->messages()->create([
                    'sender' => $sender,
                    'author' => $author,
                    'body' => $body,
                    // Spread over the week so the timestamps read sensibly.
                    'created_at' => now()->subDays(7 - $i * 3),
                    'updated_at' => now()->subDays(7 - $i * 3),
                ]);
            }
        }

        if (Announcement::count() === 0) {
            Announcement::create([
                'user_id' => null,
                'kind' => 'announcement',
                'title' => 'September intake deadlines',
                'body' => 'Most UK universities close September applications at the end of June. If your file is not complete by then we will look at January instead.',
                'created_at' => now()->subDays(5),
                'updated_at' => now()->subDays(5),
            ]);
            Announcement::create([
                'user_id' => $student->id,
                'kind' => 'stage',
                'title' => 'CAS issued',
                'body' => 'Portsmouth issued your CAS on 19 May. The visa file is the last stage.',
                'href' => '/student',
                'created_at' => now()->subDays(2),
                'updated_at' => now()->subDays(2),
            ]);
        }
    }
}
