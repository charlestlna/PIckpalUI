<?php

use App\Http\Controllers\Api\PickPalController;
use Illuminate\Support\Facades\Route;

Route::get('/health', [PickPalController::class, 'health']);
Route::post('/admin/login', [PickPalController::class, 'adminLogin']);
Route::post('/voter/login', [PickPalController::class, 'voterLogin']);
Route::post('/password/forgot', [PickPalController::class, 'requestPasswordReset']);
Route::post('/password/reset', [PickPalController::class, 'resetPassword']);
Route::post('/voters/register', [PickPalController::class, 'registerVoter']);

Route::middleware('api.token')->group(function () {
    Route::get('/me', [PickPalController::class, 'me']);
    Route::post('/logout', [PickPalController::class, 'logout']);
    Route::post('/uploads/images', [PickPalController::class, 'uploadImage']);
});

Route::middleware('api.token:admin')->group(function () {
    Route::post('/admin/password', [PickPalController::class, 'changeAdminPassword']);
    Route::post('/admin/transfer', [PickPalController::class, 'transferAdmin']);
    Route::get('/admin/dashboard', [PickPalController::class, 'dashboardStats']);
    Route::get('/admin/analytics', [PickPalController::class, 'surveyAnalytics']);

    Route::post('/elections', [PickPalController::class, 'createElection']);
    Route::get('/admin/elections', [PickPalController::class, 'adminElections']);
    Route::put('/elections/{publicId}', [PickPalController::class, 'updateElection']);
    Route::patch('/elections/{publicId}/status', [PickPalController::class, 'updateElectionStatus']);
    Route::patch('/elections/{publicId}/archive', [PickPalController::class, 'updateElectionArchive']);
    Route::delete('/elections/{publicId}', [PickPalController::class, 'deleteElection']);
    Route::patch('/elections/{publicId}/results-publish', [PickPalController::class, 'updateResultsPublishStatus']);
    Route::get('/admin/elections/{publicId}/results', [PickPalController::class, 'adminResults']);
    Route::post('/elections/{publicId}/positions', [PickPalController::class, 'createPosition']);
    Route::put('/elections/{publicId}/positions/{position}', [PickPalController::class, 'updatePosition']);
    Route::delete('/elections/{publicId}/positions/{position}', [PickPalController::class, 'deletePosition']);
    Route::get('/admin/elections/{publicId}/candidates', [PickPalController::class, 'adminCandidates']);
    Route::post('/elections/{publicId}/candidates', [PickPalController::class, 'createCandidate']);
    Route::put('/elections/{publicId}/candidates/{candidate}', [PickPalController::class, 'updateCandidate']);
    Route::delete('/elections/{publicId}/candidates/{candidate}', [PickPalController::class, 'deleteCandidate']);

    Route::post('/surveys', [PickPalController::class, 'createSurvey']);
    Route::get('/surveys/{publicId}/responses', [PickPalController::class, 'surveyResponses']);
    Route::put('/surveys/{publicId}', [PickPalController::class, 'updateSurvey']);
    Route::delete('/surveys/{publicId}', [PickPalController::class, 'deleteSurvey']);

    Route::get('/voters', [PickPalController::class, 'voters']);
    Route::get('/official-students', [PickPalController::class, 'officialStudents']);
    Route::post('/official-students/import', [PickPalController::class, 'importOfficialStudents']);
    Route::post('/voters/import', [PickPalController::class, 'importVoters']);
    Route::patch('/voters/{voter}/status', [PickPalController::class, 'updateVoterStatus']);
    Route::get('/audit-logs', [PickPalController::class, 'auditLogs']);
});

Route::middleware('api.token:voter')->group(function () {
    Route::post('/voter/password', [PickPalController::class, 'changeVoterPassword']);
    Route::patch('/voter/profile-photo', [PickPalController::class, 'updateVoterProfilePhoto']);
    Route::get('/voter/voting-status', [PickPalController::class, 'voterVotingStatus']);
    Route::get('/elections/{publicId}/eligibility', [PickPalController::class, 'voteEligibility']);
    Route::post('/surveys/{publicId}/responses', [PickPalController::class, 'submitSurveyResponse']);
    Route::post('/votes', [PickPalController::class, 'castVote']);
});

Route::get('/elections', [PickPalController::class, 'elections']);
Route::get('/elections/{publicId}', [PickPalController::class, 'election']);
Route::get('/elections/{publicId}/candidates', [PickPalController::class, 'candidates']);
Route::get('/elections/{publicId}/results', [PickPalController::class, 'results']);
Route::get('/surveys', [PickPalController::class, 'surveys']);
