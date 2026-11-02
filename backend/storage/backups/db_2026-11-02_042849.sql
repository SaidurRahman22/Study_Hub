-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: 127.0.0.1    Database: studyhub
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `announcements`
--

DROP TABLE IF EXISTS `announcements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `announcements` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `kind` enum('document','stage','message','announcement') NOT NULL DEFAULT 'announcement',
  `title` varchar(255) NOT NULL,
  `body` text DEFAULT NULL,
  `href` varchar(255) DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `announcements_created_by_foreign` (`created_by`),
  KEY `announcements_user_id_created_at_index` (`user_id`,`created_at`),
  CONSTRAINT `announcements_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `announcements_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `announcements`
--

LOCK TABLES `announcements` WRITE;
/*!40000 ALTER TABLE `announcements` DISABLE KEYS */;
INSERT INTO `announcements` VALUES (2,NULL,'announcement','September intake deadlines','Most UK universities close September applications at the end of June. If your file is not complete by then we will look at January instead.',NULL,NULL,'2026-10-27 13:29:16','2026-10-27 13:29:16'),(3,2,'stage','CAS issued','Portsmouth issued your CAS on 19 May. The visa file is the last stage.','/student',NULL,'2026-10-30 13:29:16','2026-10-30 13:29:16');
/*!40000 ALTER TABLE `announcements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `application_stages`
--

DROP TABLE IF EXISTS `application_stages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `application_stages` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `state` varchar(255) NOT NULL DEFAULT 'todo',
  `date_label` varchar(255) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `position` int(10) unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `application_stages_user_id_foreign` (`user_id`),
  CONSTRAINT `application_stages_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `application_stages`
--

LOCK TABLES `application_stages` WRITE;
/*!40000 ALTER TABLE `application_stages` DISABLE KEYS */;
INSERT INTO `application_stages` VALUES (1,2,'Counselling','done','12 Feb 2026','Course and country agreed after two sittings.',0,'2026-11-01 12:25:50','2026-11-01 12:25:50'),(2,2,'Documents','done','03 Mar 2026','Transcripts, certificates and IELTS report checked in-house.',1,'2026-11-01 12:25:50','2026-11-01 12:25:50'),(3,2,'Application sent','done','21 Mar 2026','Submitted to Portsmouth with the SOP and one reference.',2,'2026-11-01 12:25:50','2026-11-01 12:25:50'),(4,2,'Offer received','done','22 Apr 2026','Unconditional offer. Deposit paid 06 May, CAS issued 19 May.',3,'2026-11-01 12:25:50','2026-11-01 12:25:50'),(5,2,'Visa file','now','Since 20 May 2026','Two items left before the file can be submitted.',4,'2026-11-01 12:25:50','2026-11-01 12:25:50'),(6,2,'Departure','todo','Expected Sep 2026',NULL,5,'2026-11-01 12:25:50','2026-11-01 12:25:50'),(13,4,'Counselling','now','Just started',NULL,0,'2026-11-01 13:03:14','2026-11-01 13:03:14'),(14,4,'Documents','todo','',NULL,1,'2026-11-01 13:03:14','2026-11-01 13:03:14'),(15,4,'Application sent','todo','',NULL,2,'2026-11-01 13:03:14','2026-11-01 13:03:14'),(16,4,'Offer received','todo','',NULL,3,'2026-11-01 13:03:14','2026-11-01 13:03:14'),(17,4,'Visa file','todo','',NULL,4,'2026-11-01 13:03:14','2026-11-01 13:03:14'),(18,4,'Departure','todo','',NULL,5,'2026-11-01 13:03:14','2026-11-01 13:03:14');
/*!40000 ALTER TABLE `application_stages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cache`
--

DROP TABLE IF EXISTS `cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cache` (
  `key` varchar(255) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` bigint(20) NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache`
--

LOCK TABLES `cache` WRITE;
/*!40000 ALTER TABLE `cache` DISABLE KEYS */;
INSERT INTO `cache` VALUES ('study-hub-bd-cache-94d92f976fd06fd3e8cf53ec4e03d646','i:1;',1793593713),('study-hub-bd-cache-94d92f976fd06fd3e8cf53ec4e03d646:timer','i:1793593713;',1793593713);
/*!40000 ALTER TABLE `cache` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cache_locks`
--

DROP TABLE IF EXISTS `cache_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cache_locks` (
  `key` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `expiration` bigint(20) NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_locks_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache_locks`
--

LOCK TABLES `cache_locks` WRITE;
/*!40000 ALTER TABLE `cache_locks` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache_locks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `case_notes`
--

DROP TABLE IF EXISTS `case_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `case_notes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `title` varchar(255) NOT NULL,
  `body` text DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'todo',
  `date_label` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `case_notes_user_id_foreign` (`user_id`),
  CONSTRAINT `case_notes_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `case_notes`
--

LOCK TABLES `case_notes` WRITE;
/*!40000 ALTER TABLE `case_notes` DISABLE KEYS */;
/*!40000 ALTER TABLE `case_notes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `documents`
--

DROP TABLE IF EXISTS `documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `documents` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `group` varchar(255) NOT NULL DEFAULT 'application',
  `status` varchar(255) NOT NULL DEFAULT 'needed',
  `path` varchar(255) DEFAULT NULL,
  `original_name` varchar(255) DEFAULT NULL,
  `size` bigint(20) unsigned DEFAULT NULL,
  `mime` varchar(255) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `uploaded_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `documents_uploaded_by_foreign` (`uploaded_by`),
  KEY `documents_user_id_group_index` (`user_id`,`group`),
  CONSTRAINT `documents_uploaded_by_foreign` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `documents_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `documents`
--

LOCK TABLES `documents` WRITE;
/*!40000 ALTER TABLE `documents` DISABLE KEYS */;
INSERT INTO `documents` VALUES (2,2,'Passport, bio page','application','accepted','documents/2/efe47e29-f7b5-4bd5-b602-761b2270c2d1.pdf','acctest.pdf',87,'application/pdf','Original seen in the office on 03 Mar.',1,'2026-11-01 13:11:48','2026-11-01 22:26:12'),(3,2,'Academic transcripts','application','accepted',NULL,NULL,NULL,NULL,'Checked against the originals in-house.',NULL,'2026-11-01 13:11:48','2026-11-01 13:11:48'),(4,2,'IELTS test report form','application','accepted',NULL,NULL,NULL,NULL,'Overall 7.0, no band below 6.5.',NULL,'2026-11-01 13:11:48','2026-11-01 13:11:48'),(5,2,'Statement of purpose','application','accepted',NULL,NULL,NULL,NULL,'Final version sent with the application.',NULL,'2026-11-01 13:11:48','2026-11-01 13:11:48'),(6,2,'Bank statement, 28 days','visa','needed',NULL,NULL,NULL,NULL,'Must cover the full 28 days and end within 31 days of the application.',NULL,'2026-11-01 13:11:48','2026-11-01 13:11:48'),(7,2,'Bank solvency certificate','visa','needed',NULL,NULL,NULL,NULL,'Ask the branch for it on bank letterhead, signed and dated.',NULL,'2026-11-01 13:11:48','2026-11-01 13:16:24'),(8,2,'Tuberculosis test certificate','visa','review',NULL,NULL,NULL,NULL,'Sent to the office, being checked against the UKVI clinic list.',NULL,'2026-11-01 13:11:48','2026-11-01 13:11:48'),(9,2,'CAS statement','visa','accepted',NULL,NULL,NULL,NULL,'Issued 19 May 2026.',NULL,'2026-11-01 13:11:48','2026-11-01 13:11:48'),(10,2,'Police clearance certificate','visa','later',NULL,NULL,NULL,NULL,'Not needed for this course and country.',NULL,'2026-11-01 13:11:48','2026-11-01 13:11:48');
/*!40000 ALTER TABLE `documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `enquiries`
--

DROP TABLE IF EXISTS `enquiries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `enquiries` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `destination` varchar(255) DEFAULT NULL,
  `need` varchar(255) DEFAULT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `source` varchar(255) NOT NULL DEFAULT 'contact',
  `status` varchar(255) NOT NULL DEFAULT 'new',
  `scheduled_at` timestamp NULL DEFAULT NULL,
  `timezone` varchar(255) DEFAULT NULL,
  `online` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `enquiries_status_index` (`status`),
  KEY `enquiries_created_at_index` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `enquiries`
--

LOCK TABLES `enquiries` WRITE;
/*!40000 ALTER TABLE `enquiries` DISABLE KEYS */;
INSERT INTO `enquiries` VALUES (1,'Rifat Test','rifat@example.com','01712-000000','United Kingdom','Student visa','Visa help','Please help with my UK visa.','contact','new',NULL,NULL,0,'2026-11-01 12:11:58','2026-11-01 12:11:58'),(2,'Playwright Lead','pw@example.com','01710-123456',NULL,NULL,NULL,'Testing the real contact form submit.','contact','new',NULL,NULL,0,'2026-11-01 12:14:38','2026-11-01 12:14:38');
/*!40000 ALTER TABLE `enquiries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `failed_jobs`
--

DROP TABLE IF EXISTS `failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `failed_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) NOT NULL,
  `connection` varchar(255) NOT NULL,
  `queue` varchar(255) NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`),
  KEY `failed_jobs_connection_queue_failed_at_index` (`connection`,`queue`,`failed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `failed_jobs`
--

LOCK TABLES `failed_jobs` WRITE;
/*!40000 ALTER TABLE `failed_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `failed_jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_batches`
--

DROP TABLE IF EXISTS `job_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `job_batches` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `total_jobs` int(11) NOT NULL,
  `pending_jobs` int(11) NOT NULL,
  `failed_jobs` int(11) NOT NULL,
  `failed_job_ids` longtext NOT NULL,
  `options` mediumtext DEFAULT NULL,
  `cancelled_at` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  `finished_at` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_batches`
--

LOCK TABLES `job_batches` WRITE;
/*!40000 ALTER TABLE `job_batches` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jobs`
--

DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) NOT NULL,
  `payload` longtext NOT NULL,
  `attempts` smallint(5) unsigned NOT NULL,
  `reserved_at` int(10) unsigned DEFAULT NULL,
  `available_at` int(10) unsigned NOT NULL,
  `created_at` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jobs`
--

LOCK TABLES `jobs` WRITE;
/*!40000 ALTER TABLE `jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `messages` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `sender` enum('student','agency') NOT NULL,
  `author` varchar(255) NOT NULL,
  `body` text NOT NULL,
  `staff_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `messages_staff_id_foreign` (`staff_id`),
  KEY `messages_user_id_created_at_index` (`user_id`,`created_at`),
  CONSTRAINT `messages_staff_id_foreign` FOREIGN KEY (`staff_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `messages_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `messages`
--

LOCK TABLES `messages` WRITE;
/*!40000 ALTER TABLE `messages` DISABLE KEYS */;
INSERT INTO `messages` VALUES (4,2,'agency','Rakib Hasan','Your offer from Portsmouth is unconditional. Pay the deposit by 06 May and we will ask for the CAS the same week.',NULL,'2026-10-25 13:29:16','2026-10-25 13:29:16'),(5,2,'student','Nusrat Jahan','Deposit paid this morning. I have the receipt from the bank.',NULL,'2026-10-28 13:29:16','2026-10-28 13:29:16'),(6,2,'agency','Rakib Hasan','Received, thank you. The CAS came through on 19 May. Two items are left on the visa file: the 28 day bank statement and the solvency certificate.',NULL,'2026-10-31 13:29:16','2026-10-31 13:29:16');
/*!40000 ALTER TABLE `messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'0001_01_01_000000_create_users_table',1),(2,'0001_01_01_000001_create_cache_table',1),(3,'0001_01_01_000002_create_jobs_table',1),(4,'2026_11_01_181027_create_personal_access_tokens_table',2),(5,'2026_11_01_181028_create_enquiries_table',3),(6,'2026_11_01_182230_add_profile_to_users_table',4),(7,'2026_11_01_182231_create_application_stages_table',4),(8,'2026_11_01_182232_create_case_notes_table',4),(9,'2026_11_01_184921_add_schedule_to_enquiries_table',5),(10,'2026_11_01_190054_create_documents_table',6),(11,'2026_11_01_192156_create_messages_table',7),(12,'2026_11_01_192157_create_announcements_table',7);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `personal_access_tokens`
--

DROP TABLE IF EXISTS `personal_access_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `personal_access_tokens` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` bigint(20) unsigned NOT NULL,
  `name` text NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
  KEY `personal_access_tokens_expires_at_index` (`expires_at`)
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `personal_access_tokens`
--

LOCK TABLES `personal_access_tokens` WRITE;
/*!40000 ALTER TABLE `personal_access_tokens` DISABLE KEYS */;
INSERT INTO `personal_access_tokens` VALUES (1,'App\\Models\\User',1,'web','64031c57d852909c52b95ff00ba9f393a08976e1bf614b03f6f2bc0989812f18','[\"*\"]','2026-11-01 12:26:04',NULL,'2026-11-01 12:26:04','2026-11-01 12:26:04'),(4,'App\\Models\\User',1,'web','68298f2180e91bd768805379eaaa044ff388e1261c4a4f710ff9250a5b8313ad','[\"*\"]','2026-11-01 12:53:48',NULL,'2026-11-01 12:53:42','2026-11-01 12:53:48'),(5,'App\\Models\\User',1,'web','4cdc33962f17f95b822160084edd91231d89f1b9c48985c7b52b15130b8b4a52','[\"*\"]','2026-11-01 12:55:18',NULL,'2026-11-01 12:55:18','2026-11-01 12:55:18'),(6,'App\\Models\\User',1,'web','60c6727ae7b5e36824d10e76ed0cb48b9a622dc7756a541b33f030db9c133458','[\"*\"]','2026-11-01 12:55:55',NULL,'2026-11-01 12:55:47','2026-11-01 12:55:55'),(7,'App\\Models\\User',1,'web','b2b095de27b122ab700d20d690688c10a4986c82f62733cdc695d43688a39c48','[\"*\"]','2026-11-01 12:55:59',NULL,'2026-11-01 12:55:58','2026-11-01 12:55:59'),(8,'App\\Models\\User',1,'web','e11542fae42a0b35d81c80c3e3e12355ae8afc636d524c1e5ab8e38891d91bdd','[\"*\"]','2026-11-01 12:56:14',NULL,'2026-11-01 12:56:14','2026-11-01 12:56:14'),(9,'App\\Models\\User',1,'web','04b4fc6718304c836a0b32bd826e3f7c9fec0de8f800cae3cb482bfe33d16d53','[\"*\"]','2026-11-01 13:02:56',NULL,'2026-11-01 13:02:55','2026-11-01 13:02:56'),(10,'App\\Models\\User',1,'web','afaf9076006b01c6a45de3854bac22ce11a4bdaf1faff9a3584b152517133006','[\"*\"]','2026-11-01 13:03:14',NULL,'2026-11-01 13:03:13','2026-11-01 13:03:14'),(12,'App\\Models\\User',4,'web','8b20182ce5e10318d14cbdda6785227f80e292c94d8d786c5d5a2ddc2e96c665','[\"*\"]','2026-11-01 13:03:15',NULL,'2026-11-01 13:03:14','2026-11-01 13:03:15'),(13,'App\\Models\\User',1,'web','29b7114ba41673a9fa89e7f9e353a6c3a6f92ad24a3d6dc79dc13503c93e80c3','[\"*\"]','2026-11-01 13:15:26',NULL,'2026-11-01 13:15:03','2026-11-01 13:15:26'),(15,'App\\Models\\User',1,'web','15acb48eb98fec6c327edb2bfaa24c1c844bf785aae3b091bf4b470c5b04a392','[\"*\"]','2026-11-01 13:18:47',NULL,'2026-11-01 13:18:28','2026-11-01 13:18:47'),(17,'App\\Models\\User',1,'web','f63ea31c2d74ea58e28328fc7f9c0f5ca5f26ff5778fe7e4e6eddd8284789eff','[\"*\"]','2026-11-01 13:27:48',NULL,'2026-11-01 13:27:43','2026-11-01 13:27:48'),(19,'App\\Models\\User',1,'web','f7df4bc8ce71d1f1fd760985ce3c9d992a7fde8ac0959435af432fe019ee8e37','[\"*\"]','2026-11-01 13:28:49',NULL,'2026-11-01 13:28:48','2026-11-01 13:28:49'),(20,'App\\Models\\User',1,'web','f7e76bc4961c8bb15e2fd5c380a75146850eaa6c234df721e9f87a4c88ea7faf','[\"*\"]','2026-11-01 13:34:26',NULL,'2026-11-01 13:34:14','2026-11-01 13:34:26'),(21,'App\\Models\\User',1,'web','bc7ccde5a19c5261ea2dd4dfcbc5ec81d7d4981d669b2b8b46b93ce35f1cb50f','[\"*\"]','2026-11-01 13:35:36',NULL,'2026-11-01 13:35:24','2026-11-01 13:35:36'),(22,'App\\Models\\User',1,'web','0ba83500edb69dc3a4a635d0945cc70d7327ecb8e5c8d158a046748318e4848f','[\"*\"]','2026-11-01 13:36:40',NULL,'2026-11-01 13:36:22','2026-11-01 13:36:40'),(25,'App\\Models\\User',1,'web','ebc28a5ce473977e41d6df328fc1a65160d3e15e5694c973666eca9cc6ef316e','[\"*\"]','2026-11-01 20:00:41',NULL,'2026-11-01 20:00:39','2026-11-01 20:00:41'),(34,'App\\Models\\User',1,'web-open','8cbab102099dfc4a295ecb57c9a8d581b4450a26ac33bb3559c990ff907494b2','[\"*\"]',NULL,NULL,'2026-11-01 21:48:14','2026-11-01 21:48:14'),(37,'App\\Models\\User',1,'web','0941eb525e40d4398c01799640fb6fbb9e1b512c7c455cc0a2639ba0465f3517','[\"*\"]',NULL,NULL,'2026-11-01 22:05:59','2026-11-01 22:05:59'),(42,'App\\Models\\User',1,'web-open','c229ab71e5c477540ef9d3faeb9f5ebc8a767a2a498f5a9c359f2390405e2792','[\"*\"]','2026-11-01 22:21:45',NULL,'2026-11-01 22:21:42','2026-11-01 22:21:45'),(43,'App\\Models\\User',1,'web-open','c0a3f5a4ef6e1ee424fe0d587ef949cabfcc51f964c537d9c066b47f6b2f020d','[\"*\"]','2026-11-01 22:25:33',NULL,'2026-11-01 22:25:32','2026-11-01 22:25:33'),(44,'App\\Models\\User',1,'web-open','296ba83e791e7b2b4323a8586bb424eef70370a654a27eff858560477a6cebde','[\"*\"]','2026-11-01 22:25:54',NULL,'2026-11-01 22:25:50','2026-11-01 22:25:54'),(45,'App\\Models\\User',1,'web-open','c62ec4689f4467e72312d388a5beff05e4cc850c7abb620d9455254cc6e57cc2','[\"*\"]','2026-11-01 22:26:12',NULL,'2026-11-01 22:26:12','2026-11-01 22:26:12'),(46,'App\\Models\\User',2,'web','7911b34ab31b54465d10a095401e0244d1a2e2eedf80509a3e3697b0fda67675','[\"*\"]','2026-11-01 22:27:22',NULL,'2026-11-01 22:27:19','2026-11-01 22:27:22'),(48,'App\\Models\\User',2,'web','610e4ed62dbbc563d2282b3c3a2ad7ac5253c881fdae8958d797d0e55531604a','[\"*\"]',NULL,NULL,'2026-11-01 22:27:32','2026-11-01 22:27:32'),(49,'App\\Models\\User',2,'web-open','68d693a0ce337510af27a6e878454a7721c0cc38699c060fdb16e8178a707043','[\"*\"]',NULL,NULL,'2026-11-01 22:27:33','2026-11-01 22:27:33');
/*!40000 ALTER TABLE `personal_access_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `payload` longtext NOT NULL,
  `last_activity` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `role` varchar(255) NOT NULL DEFAULT 'student',
  `phone` varchar(255) DEFAULT NULL,
  `student_code` varchar(255) DEFAULT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `remember_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `counsellor` varchar(255) DEFAULT NULL,
  `country` varchar(255) DEFAULT NULL,
  `university` varchar(255) DEFAULT NULL,
  `course` varchar(255) DEFAULT NULL,
  `intake` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  UNIQUE KEY `users_student_code_unique` (`student_code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Amirul Islam','admin@studyhub.test','admin',NULL,NULL,NULL,'$2y$12$Lvvufp7iM13/5f5WZnYfc.5mr9cgP/ghNRMvxm1k2m/QuUzc97Zsa',NULL,'2026-11-01 12:25:50','2026-11-01 13:29:16',NULL,NULL,NULL,NULL,NULL),(2,'Nusrat Jahan','student@demo.studyhubbd.com','student','01712-345678','SHB-2026-0184',NULL,'$2y$12$q7oab2cUeOkbqKerZFmffuOQpc0upd8o4OOOWZJuUw/BioAY2FD9e',NULL,'2026-11-01 12:25:50','2026-11-01 22:27:22','Rakib Hasan','United Kingdom','University of Portsmouth','MSc Computer Science','September 2026'),(4,'Other Student','other@demo.test','student',NULL,'SHB-OTHER-1',NULL,'$2y$12$fzghBbj8wVyOWr.zcBDwaean2Le.1o5N/FofYA.RGpxBLK2YxkA.2',NULL,'2026-11-01 13:03:14','2026-11-01 13:03:14',NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'studyhub'
--

--
-- Dumping routines for database 'studyhub'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-02 10:28:50
