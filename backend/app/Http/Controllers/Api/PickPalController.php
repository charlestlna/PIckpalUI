<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApiToken;
use App\Models\AuditLog;
use App\Models\Candidate;
use App\Models\Department;
use App\Models\Election;
use App\Models\OfficialStudent;
use App\Models\Position;
use App\Models\Survey;
use App\Models\SurveyAnswer;
use App\Models\SurveyQuestion;
use App\Models\SurveyResponse;
use App\Models\User;
use App\Models\Vote;
use App\Models\VoteSelection;
use App\Models\Voter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PickPalController extends Controller
{
    public function health(): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'service' => 'PickPal API',
        ]);
    }

    public function adminLogin(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $admin = User::with('department')->where('email', $validated['email'])->first();

        if (! $admin || ! Hash::check($validated['password'], $admin->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid admin email or password.'],
            ]);
        }

        return response()->json([
            'message' => 'Admin login successful.',
            'token' => $this->issueToken('admin', $admin->id),
            'user' => $this->adminPayload($admin),
        ]);
    }

    public function requestPasswordReset(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'role' => ['required', 'string', 'in:admin,voter'],
            'email' => ['required', 'email'],
        ]);

        $email = Str::lower($validated['email']);
        $account = $validated['role'] === 'admin'
            ? User::where('email', $email)->first()
            : Voter::where('email', $email)->first();

        if (! $account) {
            throw ValidationException::withMessages([
                'email' => ['No account was found for this email and role.'],
            ]);
        }

        $token = (string) random_int(100000, 999999);
        $tokenKey = "{$validated['role']}:{$email}";

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $tokenKey],
            [
                'token' => Hash::make($token),
                'created_at' => now(),
            ],
        );

        Mail::raw(
            "Your PickPal password reset code is: {$token}\n\nThis code expires in 30 minutes. If you did not request this, you can ignore this message.",
            fn ($message) => $message
                ->to($account->email)
                ->subject('PickPal Password Reset Code'),
        );

        AuditLog::create([
            'department_id' => $account->department_id,
            'actor' => $email,
            'action' => 'password_reset.requested',
            'details' => "Password reset requested for {$validated['role']} account.",
            'ip_address' => $request->ip(),
            'occurred_at' => now(),
        ]);

        return response()->json([
            'message' => 'Password reset code sent to your email.',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'role' => ['required', 'string', 'in:admin,voter'],
            'email' => ['required', 'email'],
            'token' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $email = Str::lower($validated['email']);
        $tokenKey = "{$validated['role']}:{$email}";
        $record = DB::table('password_reset_tokens')->where('email', $tokenKey)->first();

        if (! $record || ! $record->created_at || now()->diffInMinutes($record->created_at) > 30 || ! Hash::check($validated['token'], $record->token)) {
            throw ValidationException::withMessages([
                'token' => ['The reset code is invalid or expired.'],
            ]);
        }

        $account = $validated['role'] === 'admin'
            ? User::where('email', $email)->first()
            : Voter::where('email', $email)->first();

        if (! $account) {
            throw ValidationException::withMessages([
                'email' => ['No account was found for this reset request.'],
            ]);
        }

        $account->update(['password' => $validated['password']]);
        DB::table('password_reset_tokens')->where('email', $tokenKey)->delete();

        AuditLog::create([
            'department_id' => $account->department_id,
            'actor' => $email,
            'action' => 'password_reset.completed',
            'details' => "Password reset completed for {$validated['role']} account.",
            'ip_address' => $request->ip(),
            'occurred_at' => now(),
        ]);

        return response()->json([
            'message' => 'Password has been reset. You can sign in with the new password.',
        ]);
    }

    public function dashboardStats(): JsonResponse
    {
        $request = request();
        $admin = $this->currentAdmin($request);
        $departmentId = $admin->department_id;

        $activeElections = Election::when($departmentId, fn ($query) => $query->where('department_id', $departmentId))->where('status', 'open')->whereNull('archived_at')->count();
        $registeredVoters = Voter::when($departmentId, fn ($query) => $query->where('department_id', $departmentId))->where('registration_status', 'approved')->count();
        $totalCandidates = Candidate::whereHas('position.election', fn ($query) => $query->when($departmentId, fn ($inner) => $inner->where('department_id', $departmentId)))->count();
        $totalVotes = Vote::whereHas('election', fn ($query) => $query->when($departmentId, fn ($inner) => $inner->where('department_id', $departmentId)))->count();
        $turnout = $registeredVoters > 0 ? round(($totalVotes / $registeredVoters) * 100) : 0;

        $currentElection = Election::with(['positions.candidates', 'department'])
            ->withCount('votes')
            ->where('status', 'open')
            ->whereNull('archived_at')
            ->when($departmentId, fn ($query) => $query->where('department_id', $departmentId))
            ->orderBy('ends_at')
            ->first();

        $pendingVoters = Voter::when($departmentId, fn ($query) => $query->where('department_id', $departmentId))->where('registration_status', 'pending')->count();
        $surveyResponses = SurveyResponse::whereHas('survey', fn ($query) => $query->where('department_id', $departmentId))->count();

        return response()->json([
            'stats' => [
                'active_elections' => $activeElections,
                'registered_voters' => $registeredVoters,
                'total_candidates' => $totalCandidates,
                'turnout' => $turnout,
            ],
            'current_election' => $currentElection ? [
                'id' => $currentElection->public_id,
                'title' => $currentElection->title,
                'status' => $currentElection->status,
                'ends_at' => $currentElection->ends_at?->toIso8601String(),
                'votes' => $currentElection->votes_count,
                'total_voters' => $this->eligibleVoterCount($currentElection),
                'candidates' => $currentElection->positions->sum(fn ($position) => $position->candidates->count()),
            ] : null,
            'alerts' => [
                $pendingVoters > 0 ? "{$pendingVoters} voter registrations are pending approval." : 'No pending voter registrations.',
                $surveyResponses > 0 ? "{$surveyResponses} survey responses have been submitted." : 'No survey responses yet.',
                'Audit log is available for review.',
            ],
        ]);
    }

    public function surveyAnalytics(): JsonResponse
    {
        $admin = $this->currentAdmin(request());
        $surveys = Survey::with(['questions', 'responses'])
            ->withCount('responses')
            ->where('department_id', $admin->department_id)
            ->orderByDesc('created_at')
            ->get()
            ->map(function (Survey $survey) {
                return [
                    'id' => $survey->public_id,
                    'title' => $survey->title,
                    'response_count' => $survey->responses_count,
                    'questions' => $survey->questions->map(function (SurveyQuestion $question) {
                        $answers = SurveyAnswer::query()
                            ->select('answer', DB::raw('count(*) as total'))
                            ->where('survey_question_id', $question->id)
                            ->groupBy('answer')
                            ->orderByDesc('total')
                            ->get();

                        $total = $answers->sum('total');

                        return [
                            'id' => $question->id,
                            'text' => $question->text,
                            'type' => $question->type,
                            'total' => $total,
                            'answers' => $answers->map(fn (SurveyAnswer $answer) => [
                                'label' => $answer->answer,
                                'count' => (int) $answer->total,
                                'pct' => $total > 0 ? round(((int) $answer->total / $total) * 100) : 0,
                            ])->values(),
                        ];
                    })->values(),
                ];
            });

        return response()->json([
            'total_responses' => $surveys->sum('response_count'),
            'surveys' => $surveys,
        ]);
    }

    public function elections(Request $request): JsonResponse
    {
        $token = $this->requireToken($request);
        $elections = Election::with(['department', 'positions.candidates'])
            ->withCount('votes')
            ->whereNull('archived_at')
            ->when($token->actor_type === 'admin', function ($query) use ($token) {
                $admin = User::findOrFail($token->actor_id);
                $query->where('department_id', $admin->department_id);
            })
            ->when($token->actor_type === 'voter', function ($query) use ($token) {
                $voter = Voter::findOrFail($token->actor_id);
                $query->where(function ($visible) use ($voter) {
                    $visible->where('department_id', $voter->department_id)
                        ->orWhereHas('department', fn ($department) => $department->where('code', 'SSC'));
                });
            })
            ->orderByDesc('starts_at')
            ->get()
            ->map(fn (Election $election) => $this->electionPayload($election));

        return response()->json($elections);
    }

    public function adminElections(Request $request): JsonResponse
    {
        $admin = $this->currentAdmin($request);
        $includeArchived = $request->boolean('include_archived');

        $elections = Election::with(['department', 'positions.candidates'])
            ->withCount('votes')
            ->where('department_id', $admin->department_id)
            ->when(! $includeArchived, fn ($query) => $query->whereNull('archived_at'))
            ->orderByDesc('starts_at')
            ->get()
            ->map(fn (Election $election) => $this->electionPayload($election));

        return response()->json($elections);
    }

    public function createElection(Request $request): JsonResponse
    {
        $admin = $this->currentAdmin($request);
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after_or_equal:starts_at'],
            'positions' => ['required', 'array', 'min:1'],
            'positions.*' => ['required', 'string', 'max:120'],
        ]);

        $department = $admin->department;

        if (! $department) {
            throw ValidationException::withMessages([
                'department' => ['This admin account does not have an assigned department.'],
            ]);
        }

        $election = DB::transaction(function () use ($validated, $department, $request) {
            $publicId = Str::slug($validated['title']).'-'.Str::lower(Str::random(5));

            $election = Election::create([
                'department_id' => $department->id,
                'public_id' => $publicId,
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'status' => 'upcoming',
                'starts_at' => $validated['starts_at'],
                'ends_at' => $validated['ends_at'],
                'results_published' => $this->databaseBoolean(false),
            ]);

            foreach (array_values($validated['positions']) as $index => $name) {
                Position::create([
                    'election_id' => $election->id,
                    'slug' => Str::slug($name),
                    'name' => $name,
                    'display_order' => $index + 1,
                ]);
            }

            AuditLog::create([
                'department_id' => $department->id,
                'actor' => 'admin',
                'action' => 'election.created',
                'details' => "Created election {$election->title}.",
                'ip_address' => $request->ip(),
                'occurred_at' => now(),
            ]);

            return $election;
        });

        $election->refresh()->load(['department', 'positions.candidates']);

        return response()->json($this->electionPayload($election), 201);
    }

    public function updateElection(Request $request, string $publicId): JsonResponse
    {
        $admin = $this->currentAdmin($request);
        $election = Election::with(['department', 'positions.candidates'])
            ->where('public_id', $publicId)
            ->firstOrFail();
        $this->assertAdminCanAccessDepartment($admin, $election->department_id);

        if ($election->votes()->exists()) {
            throw ValidationException::withMessages([
                'election' => ['Election details cannot be edited after votes have been submitted.'],
            ]);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after_or_equal:starts_at'],
        ]);

        $election->update([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'starts_at' => $validated['starts_at'],
            'ends_at' => $validated['ends_at'],
        ]);

        AuditLog::create([
            'department_id' => $election->department_id,
            'actor' => 'admin',
            'action' => 'election.updated',
            'details' => "Updated election {$election->title}.",
            'ip_address' => $request->ip(),
            'occurred_at' => now(),
        ]);

        $election->refresh()->load(['department', 'positions.candidates'])->loadCount('votes');

        return response()->json($this->electionPayload($election));
    }

    public function updateElectionStatus(Request $request, string $publicId): JsonResponse
    {
        $admin = $this->currentAdmin($request);
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:upcoming,open,closed'],
        ]);

        $election = Election::with(['department', 'positions.candidates'])
            ->where('public_id', $publicId)
            ->whereNull('archived_at')
            ->firstOrFail();
        $this->assertAdminCanAccessDepartment($admin, $election->department_id);

        $statusUpdate = ['status' => $validated['status']];
        if ($validated['status'] === 'open') {
            $statusUpdate['starts_at'] = now();
        }
        $election->update($statusUpdate);

        AuditLog::create([
            'department_id' => $election->department_id,
            'actor' => 'admin',
            'action' => 'election.status_updated',
            'details' => "Set {$election->title} to {$validated['status']}.",
            'ip_address' => $request->ip(),
            'occurred_at' => now(),
        ]);

        return response()->json($this->electionPayload($election));
    }

    public function updateElectionArchive(Request $request, string $publicId): JsonResponse
    {
        $validated = $request->validate([
            'archived' => ['required', 'boolean'],
        ]);

        $election = Election::with(['department', 'positions.candidates'])
            ->withCount('votes')
            ->where('public_id', $publicId)
            ->firstOrFail();

        $election->update([
            'archived_at' => $validated['archived'] ? now() : null,
        ]);

        AuditLog::create([
            'department_id' => $election->department_id,
            'actor' => 'admin',
            'action' => $validated['archived'] ? 'election.archived' : 'election.restored',
            'details' => ($validated['archived'] ? 'Archived' : 'Restored')." election {$election->title}.",
            'ip_address' => $request->ip(),
            'occurred_at' => now(),
        ]);

        $election->refresh()->load(['department', 'positions.candidates'])->loadCount('votes');

        return response()->json($this->electionPayload($election));
    }

    public function deleteElection(Request $request, string $publicId): JsonResponse
    {
        $election = Election::withCount('votes')
            ->where('public_id', $publicId)
            ->firstOrFail();

        if ($election->status !== 'upcoming' || $election->votes_count > 0) {
            throw ValidationException::withMessages([
                'election' => ['Only draft elections with no submitted votes can be deleted. Archive this election instead.'],
            ]);
        }

        $title = $election->title;
        $departmentId = $election->department_id;
        $election->delete();

        AuditLog::create([
            'department_id' => $departmentId,
            'actor' => 'admin',
            'action' => 'election.deleted',
            'details' => "Deleted draft election {$title}.",
            'ip_address' => $request->ip(),
            'occurred_at' => now(),
        ]);

        return response()->json([
            'message' => 'Election deleted.',
        ]);
    }

    public function createPosition(Request $request, string $publicId): JsonResponse
    {
        $election = Election::with(['department', 'positions.candidates'])
            ->where('public_id', $publicId)
            ->firstOrFail();

        if ($election->votes()->exists()) {
            throw ValidationException::withMessages([
                'position' => ['Positions cannot be added after votes have been cast for this election.'],
            ]);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
        ]);

        $slug = Str::slug($validated['name']);

        if (! $slug) {
            throw ValidationException::withMessages([
                'name' => ['Enter a valid position name.'],
            ]);
        }

        if ($election->positions()->where('slug', $slug)->exists()) {
            throw ValidationException::withMessages([
                'name' => ['This position already exists in the selected election.'],
            ]);
        }

        $position = Position::create([
            'election_id' => $election->id,
            'slug' => $slug,
            'name' => $validated['name'],
            'display_order' => ((int) $election->positions()->max('display_order')) + 1,
        ]);

        AuditLog::create([
            'department_id' => $election->department_id,
            'actor' => 'admin',
            'action' => 'position.created',
            'details' => "Added {$position->name} to {$election->title}.",
            'ip_address' => $request->ip(),
            'occurred_at' => now(),
        ]);

        $election->refresh()->load(['department', 'positions.candidates']);

        return response()->json($this->electionPayload($election, includePositions: true), 201);
    }

    public function updatePosition(Request $request, string $publicId, Position $position): JsonResponse
    {
        $election = Election::with(['department', 'positions.candidates'])
            ->where('public_id', $publicId)
            ->firstOrFail();

        if ($position->election_id !== $election->id) {
            abort(404);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
        ]);

        $slug = Str::slug($validated['name']);

        if (! $slug) {
            throw ValidationException::withMessages([
                'name' => ['Enter a valid position name.'],
            ]);
        }

        if ($election->positions()->where('slug', $slug)->where('id', '!=', $position->id)->exists()) {
            throw ValidationException::withMessages([
                'name' => ['This position already exists in the selected election.'],
            ]);
        }

        $oldName = $position->name;
        $position->update([
            'slug' => $slug,
            'name' => $validated['name'],
        ]);

        AuditLog::create([
            'department_id' => $election->department_id,
            'actor' => 'admin',
            'action' => 'position.updated',
            'details' => "Renamed {$oldName} to {$position->name} in {$election->title}.",
            'ip_address' => $request->ip(),
            'occurred_at' => now(),
        ]);

        $election->refresh()->load(['department', 'positions.candidates']);

        return response()->json($this->electionPayload($election, includePositions: true));
    }

    public function deletePosition(Request $request, string $publicId, Position $position): JsonResponse
    {
        $election = Election::with(['department', 'positions.candidates'])
            ->where('public_id', $publicId)
            ->firstOrFail();

        if ($position->election_id !== $election->id) {
            abort(404);
        }

        if ($election->votes()->exists()) {
            throw ValidationException::withMessages([
                'position' => ['Positions cannot be deleted after votes have been cast for this election.'],
            ]);
        }

        if ($position->candidates()->exists()) {
            throw ValidationException::withMessages([
                'position' => ['Remove this position\'s candidates before deleting it.'],
            ]);
        }

        $name = $position->name;
        $position->delete();

        AuditLog::create([
            'department_id' => $election->department_id,
            'actor' => 'admin',
            'action' => 'position.deleted',
            'details' => "Deleted {$name} from {$election->title}.",
            'ip_address' => $request->ip(),
            'occurred_at' => now(),
        ]);

        $election->refresh()->load(['department', 'positions.candidates']);

        return response()->json($this->electionPayload($election, includePositions: true));
    }

    public function updateResultsPublishStatus(Request $request, string $publicId): JsonResponse
    {
        $validated = $request->validate([
            'published' => ['required', 'boolean'],
        ]);

        $election = Election::where('public_id', $publicId)->firstOrFail();
        $election->update(['results_published' => $this->databaseBoolean($validated['published'])]);
        $election->refresh();

        AuditLog::create([
            'department_id' => $election->department_id,
            'actor' => 'admin',
            'action' => 'results.publish_status_updated',
            'details' => ($validated['published'] ? 'Published' : 'Unpublished')." results for {$election->title}.",
            'ip_address' => $request->ip(),
            'occurred_at' => now(),
        ]);

        return response()->json([
            'message' => $validated['published'] ? 'Results published.' : 'Results unpublished.',
            'published' => $election->results_published,
        ]);
    }

    public function election(Request $request, string $publicId): JsonResponse
    {
        $token = $this->requireToken($request);
        $election = Election::with(['department', 'positions.candidates'])
            ->where('public_id', $publicId)
            ->firstOrFail();

        $this->assertTokenCanAccessElection($token, $election);

        if ($election->status === 'upcoming') {
            return response()->json($this->electionPayload($election));
        }

        return response()->json($this->electionPayload($election, includePositions: true));
    }

    public function candidates(Request $request, string $publicId): JsonResponse
    {
        $token = $this->requireToken($request, 'voter');
        $election = Election::with(['positions.candidates'])
            ->where('public_id', $publicId)
            ->whereNull('archived_at')
            ->firstOrFail();
        $this->assertTokenCanAccessElection($token, $election);

        if ($election->status === 'upcoming') {
            abort(403, 'Candidates are not visible before the election opens.');
        }

        return response()->json($this->candidatePositionsPayload($election));
    }

    public function adminCandidates(string $publicId): JsonResponse
    {
        $admin = $this->currentAdmin(request());
        $election = Election::with(['positions.candidates'])
            ->where('public_id', $publicId)
            ->firstOrFail();
        $this->assertAdminCanAccessDepartment($admin, $election->department_id);

        return response()->json($this->candidatePositionsPayload($election));
    }

    public function createCandidate(Request $request, string $publicId): JsonResponse
    {
        $admin = $this->currentAdmin($request);
        $election = Election::with('positions')
            ->where('public_id', $publicId)
            ->firstOrFail();
        $this->assertAdminCanAccessDepartment($admin, $election->department_id);

        $validated = $request->validate([
            'position_id' => ['required', 'integer', 'exists:positions,id'],
            'student_number' => ['required', 'string', 'regex:/^\d{9}$/'],
            'platform' => ['nullable', 'string'],
            'photo_url' => ['nullable', 'url', 'max:2048'],
        ]);

        $position = $election->positions->firstWhere('id', (int) $validated['position_id']);

        if (! $position) {
            throw ValidationException::withMessages([
                'position_id' => ['This position does not belong to the selected election.'],
            ]);
        }

        $student = OfficialStudent::query()
            ->where('department_id', $admin->department_id)
            ->where('student_number', $validated['student_number'])
            ->first();

        if (! $student) {
            throw ValidationException::withMessages([
                'student_number' => ['Candidates must exist in your department official student list.'],
            ]);
        }

        $alreadyAdded = Candidate::where('official_student_id', $student->id)
            ->whereHas('position', fn ($query) => $query->where('election_id', $election->id))
            ->exists();

        if ($alreadyAdded) {
            throw ValidationException::withMessages([
                'student_number' => ['This student is already a candidate in the selected election.'],
            ]);
        }

        $candidate = Candidate::create([
            'position_id' => $position->id,
            'official_student_id' => $student->id,
            'name' => collect([$student->first_name, $student->middle_name, $student->last_name])->filter()->join(' '),
            'year_level' => $student->year_level,
            'section' => $student->section,
            'platform' => $validated['platform'] ?? null,
            'photo_url' => $validated['photo_url'] ?? null,
        ]);

        AuditLog::create([
            'department_id' => $election->department_id,
            'actor' => 'admin',
            'action' => 'candidate.created',
            'details' => "Added {$candidate->name} as candidate for {$position->name}.",
            'ip_address' => $request->ip(),
            'occurred_at' => now(),
        ]);

        return response()->json($this->candidatePayload($candidate), 201);
    }

    public function updateCandidate(Request $request, string $publicId, Candidate $candidate): JsonResponse
    {
        $admin = $this->currentAdmin($request);
        $election = Election::with('positions')
            ->where('public_id', $publicId)
            ->firstOrFail();
        $this->assertAdminCanAccessDepartment($admin, $election->department_id);

        if (! $election->positions->contains('id', $candidate->position_id)) {
            abort(404);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'year_level' => ['nullable', 'string', 'max:80'],
            'section' => ['nullable', 'string', 'max:80'],
            'platform' => ['nullable', 'string'],
            'photo_url' => ['nullable', 'url', 'max:2048'],
        ]);

        $candidate->update($validated);

        AuditLog::create([
            'department_id' => $election->department_id,
            'actor' => 'admin',
            'action' => 'candidate.updated',
            'details' => "Updated candidate {$candidate->name}.",
            'ip_address' => $request->ip(),
            'occurred_at' => now(),
        ]);

        return response()->json($this->candidatePayload($candidate));
    }

    public function deleteCandidate(Request $request, string $publicId, Candidate $candidate): JsonResponse
    {
        $admin = $this->currentAdmin($request);
        $election = Election::with('positions')
            ->where('public_id', $publicId)
            ->firstOrFail();
        $this->assertAdminCanAccessDepartment($admin, $election->department_id);

        if (! $election->positions->contains('id', $candidate->position_id)) {
            abort(404);
        }

        if (VoteSelection::where('candidate_id', $candidate->id)->exists()) {
            throw ValidationException::withMessages([
                'candidate' => ['This candidate already has recorded vote selections and cannot be deleted.'],
            ]);
        }

        $name = $candidate->name;
        $candidate->delete();

        AuditLog::create([
            'department_id' => $election->department_id,
            'actor' => 'admin',
            'action' => 'candidate.deleted',
            'details' => "Deleted candidate {$name}.",
            'ip_address' => $request->ip(),
            'occurred_at' => now(),
        ]);

        return response()->json(['message' => 'Candidate deleted.']);
    }

    public function voters(): JsonResponse
    {
        $admin = $this->currentAdmin(request());
        $officialStudents = OfficialStudent::with('department')
            ->where('department_id', $admin->department_id)
            ->get()
            ->keyBy('student_number');

        $voters = Voter::with('department')
            ->withCount('votes')
            ->where('department_id', $admin->department_id)
            ->orderBy('student_number')
            ->get()
            ->map(function (Voter $voter) use ($officialStudents) {
                return $this->voterPayload($voter, $officialStudents->get($voter->student_number), $voter->votes_count > 0);
            });

        return response()->json($voters);
    }

    public function officialStudents(): JsonResponse
    {
        $admin = $this->currentAdmin(request());
        $students = OfficialStudent::with('department')
            ->where('department_id', $admin->department_id)
            ->orderBy('student_number')
            ->get()
            ->map(fn (OfficialStudent $student) => $this->officialStudentPayload($student));

        return response()->json($students);
    }

    public function registerVoter(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'student_number' => ['required', 'string', 'regex:/^\d{9}$/', 'unique:voters,student_number'],
            'email' => ['required', 'email', 'max:255', 'unique:voters,email'],
            'first_name' => ['required', 'string', 'max:120', "regex:/^[A-Za-zÑñ.\\-'\\s]+$/u"],
            'middle_name' => ['nullable', 'string', 'max:120', "regex:/^[A-Za-zÑñ.\\-'\\s]+$/u"],
            'last_name' => ['required', 'string', 'max:120', "regex:/^[A-Za-zÑñ.\\-'\\s]+$/u"],
            'department' => ['required', 'string', 'max:40'],
            'year_level' => ['required', 'string', 'max:80'],
            'section' => ['required', 'string', 'max:80'],
            'password' => ['required', 'string', 'min:8'],
            'face_registered' => ['accepted'],
            'face_descriptor' => ['required', 'array', 'size:128'],
            'face_descriptor.*' => ['required', 'numeric'],
        ]);

        $department = $this->departmentFromInput($validated['department']);

        if ($this->isSscDepartment($department)) {
            throw ValidationException::withMessages([
                'department' => ['Choose the student college department. SSC is only used when creating all-department elections.'],
            ]);
        }

        $voter = Voter::create([
            'department_id' => $department->id,
            'student_number' => $validated['student_number'],
            'first_name' => $validated['first_name'],
            'middle_name' => $validated['middle_name'] ?? null,
            'last_name' => $validated['last_name'],
            'year_level' => $validated['year_level'],
            'section' => $validated['section'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'registration_status' => 'pending',
            'face_registered_at' => now(),
            'face_descriptor' => json_encode(array_map('floatval', $validated['face_descriptor'])),
        ]);

        AuditLog::create([
            'department_id' => $department->id,
            'actor' => $voter->student_number,
            'action' => 'voter.registered',
            'details' => "Voter registration submitted for {$voter->first_name} {$voter->last_name}.",
            'ip_address' => $request->ip(),
            'occurred_at' => now(),
        ]);

        return response()->json([
            'message' => 'Registration submitted for admin approval.',
            'voter' => [
                'student_number' => $voter->student_number,
                'registration_status' => $voter->registration_status,
            ],
        ], 201);
    }

    public function updateVoterStatus(Request $request, Voter $voter): JsonResponse
    {
        $admin = $this->currentAdmin($request);
        $this->assertAdminCanAccessDepartment($admin, $voter->department_id);

        $validated = $request->validate([
            'registration_status' => ['required', 'string', 'in:pending,approved,rejected'],
        ]);

        $officialStudent = OfficialStudent::with('department')
            ->where('student_number', $voter->student_number)
            ->first();
        $officialMatch = $this->officialStudentMatch($voter->loadMissing('department'), $officialStudent);

        if ($validated['registration_status'] === 'approved' && $officialMatch['status'] !== 'matched') {
            $fields = implode(', ', $officialMatch['mismatches'] ?? []);

            throw ValidationException::withMessages([
                'registration_status' => ['This registration cannot be approved because these fields do not match the official student list: '.$fields.'.'],
            ]);
        }

        $voter->update([
            'registration_status' => $validated['registration_status'],
        ]);

        AuditLog::create([
            'department_id' => $voter->department_id,
            'actor' => 'admin',
            'action' => 'voter.status_updated',
            'details' => "Set {$voter->student_number} to {$validated['registration_status']}.",
            'ip_address' => $request->ip(),
            'occurred_at' => now(),
        ]);

        $voter->load('department');

        return response()->json($this->voterPayload($voter, $officialStudent));
    }

    public function importOfficialStudents(Request $request): JsonResponse
    {
        $admin = $this->currentAdmin($request);
        $validated = $request->validate([
            'students' => ['required', 'array', 'min:1', 'max:1000'],
            'students.*.student_number' => ['required', 'string', 'regex:/^\d{9}$/'],
            'students.*.email' => ['nullable', 'email', 'max:255'],
            'students.*.first_name' => ['required', 'string', 'max:120'],
            'students.*.middle_name' => ['nullable', 'string', 'max:120'],
            'students.*.last_name' => ['required', 'string', 'max:120'],
            'students.*.department' => ['nullable', 'string', 'max:40'],
            'students.*.year_level' => ['nullable', 'string', 'max:80'],
            'students.*.section' => ['nullable', 'string', 'max:80'],
        ]);

        $imported = collect();
        $updatedCount = 0;
        $skipped = [];
        $seenStudentNumbers = [];

        DB::transaction(function () use ($validated, &$imported, &$updatedCount, &$skipped, &$seenStudentNumbers, $request, $admin) {
            foreach ($validated['students'] as $index => $row) {
                $studentNumber = trim($row['student_number']);
                $line = $index + 2;

                if (isset($seenStudentNumbers[$studentNumber])) {
                    $skipped[] = [
                        'line' => $line,
                        'student_number' => $studentNumber,
                        'reason' => 'Duplicate student number in CSV.',
                    ];
                    continue;
                }

                $seenStudentNumbers[$studentNumber] = true;

                $department = empty($row['department'])
                    ? $admin->department
                    : $this->departmentFromInput($row['department']);
                $this->assertAdminCanAccessDepartment($admin, $department->id);

                if ($this->isSscDepartment($department)) {
                    $skipped[] = [
                        'line' => $line,
                        'student_number' => $studentNumber,
                        'reason' => 'SSC is only for all-department elections, not official student records.',
                    ];
                    continue;
                }

                $yearLevel = $this->canonicalYearLevel($row['year_level'] ?? null);
                if (! $yearLevel) {
                    $skipped[] = [
                        'line' => $line,
                        'student_number' => $studentNumber,
                        'reason' => 'Year level must be between 1st Year and 4th Year.',
                    ];
                    continue;
                }

                $section = $this->canonicalSectionCode($row['section'] ?? null);
                if (! $section || Str::before($section, '-') === $this->normalizeDepartmentValue($department->code)
                    || Str::after($section, '-')[0] !== $yearLevel[0]) {
                    $skipped[] = [
                        'line' => $line,
                        'student_number' => $studentNumber,
                        'reason' => 'Section must use a program code and match the year level (for example, BSIT-4D).',
                    ];
                    continue;
                }

                $officialStudent = OfficialStudent::updateOrCreate(
                    ['student_number' => $studentNumber],
                    [
                        'department_id' => $department->id,
                        'first_name' => trim($row['first_name']),
                        'middle_name' => isset($row['middle_name']) ? (trim((string) $row['middle_name']) ?: null) : null,
                        'last_name' => trim($row['last_name']),
                        'year_level' => $yearLevel,
                        'section' => $section,
                        'email' => isset($row['email']) ? (strtolower(trim((string) $row['email'])) ?: null) : null,
                        'imported_at' => now(),
                    ],
                );

                if (! $officialStudent->wasRecentlyCreated) {
                    $updatedCount++;
                }

                $imported->push($officialStudent->load('department'));
            }

            if ($imported->isNotEmpty()) {
                AuditLog::create([
                    'department_id' => $imported->first()->department_id,
                    'actor' => 'admin',
                    'action' => 'official_students.imported',
                    'details' => "Imported or updated {$imported->count()} official student records from CSV.",
                    'ip_address' => $request->ip(),
                    'occurred_at' => now(),
                ]);
            }
        });

        return response()->json([
            'message' => "Imported {$imported->count()} official student records.",
            'imported_count' => $imported->count() - $updatedCount,
            'updated_count' => $updatedCount,
            'skipped_count' => count($skipped),
            'skipped' => $skipped,
            'students' => $imported->map(fn (OfficialStudent $student) => [
                'student_number' => $student->student_number,
                'first_name' => $student->first_name,
                'middle_name' => $student->middle_name,
                'last_name' => $student->last_name,
                'department' => $student->department?->code,
                'year_level' => $student->year_level,
                'section' => $student->section,
                'email' => $student->email,
            ])->values(),
        ], 201);
    }

    public function importVoters(Request $request): JsonResponse
    {
        if ($request->has('voters') && ! $request->has('students')) {
            $request->merge(['students' => $request->input('voters')]);
        }

        return $this->importOfficialStudents($request);
    }

    public function voterLogin(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'student_number' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $voter = Voter::with('department')
            ->where('student_number', $validated['student_number'])
            ->first();

        if (! $voter) {
            throw ValidationException::withMessages([
                'student_number' => ['No voter account was found for this student ID.'],
            ]);
        }

        if (! $voter->password || ! Hash::check($validated['password'], $voter->password)) {
            throw ValidationException::withMessages([
                'password' => ['Invalid password.'],
            ]);
        }

        if ($voter->registration_status !== 'approved') {
            throw ValidationException::withMessages([
                'student_number' => ["This voter account is {$voter->registration_status}. Admin approval is required before sign in."],
            ]);
        }

        if (! $voter->face_registered_at) {
            throw ValidationException::withMessages([
                'student_number' => ['Face registration is required before sign in.'],
            ]);
        }

        return response()->json([
            'message' => 'Voter login successful.',
            'token' => $this->issueToken('voter', $voter->id),
            'user' => $this->voterPayload($voter) + ['role' => 'voter'],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $token = $this->requireToken($request);

        if ($token->actor_type === 'admin') {
            $admin = User::with('department')->findOrFail($token->actor_id);

            return response()->json([
                'role' => 'admin',
                'user' => $this->adminPayload($admin),
            ]);
        }

        $voter = Voter::with('department')->findOrFail($token->actor_id);

        return response()->json([
            'role' => 'voter',
            'user' => [
                'role' => 'voter',
                'studentNumber' => $voter->student_number,
                'voter' => $this->voterPayload($voter),
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $token = $this->requireToken($request);
        $token->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    public function uploadImage(Request $request): JsonResponse
    {
        $this->requireToken($request, 'admin');

        $validated = $request->validate([
            'type' => ['required', 'string', 'in:candidate'],
            'image_data' => ['required', 'string'],
        ]);

        [$extension, $binary] = $this->decodeImageData($validated['image_data']);
        $maxBytes = 700 * 1024;

        if (strlen($binary) > $maxBytes) {
            throw ValidationException::withMessages([
                'image_data' => ['Image file is too large.'],
            ]);
        }

        $folder = 'pickpal/candidates';
        $path = "{$folder}/".Str::uuid().".{$extension}";

        Storage::disk('public')->put($path, $binary);

        return response()->json([
            'url' => Storage::disk('public')->url($path),
        ], 201);
    }

    public function changeAdminPassword(Request $request): JsonResponse
    {
        $token = $this->requireToken($request, 'admin');
        $admin = User::findOrFail($token->actor_id);

        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if (! Hash::check($validated['current_password'], $admin->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Current password is incorrect.'],
            ]);
        }

        $admin->update(['password' => $validated['password']]);

        AuditLog::create([
            'department_id' => $admin->department_id,
            'actor' => $admin->email,
            'action' => 'admin.password_changed',
            'details' => "Password changed for {$admin->email}.",
            'ip_address' => $request->ip(),
            'occurred_at' => now(),
        ]);

        return response()->json(['message' => 'Password changed.']);
    }

    public function transferAdmin(Request $request): JsonResponse
    {
        $admin = $this->currentAdmin($request);

        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255', 'unique:users,email,'.$admin->id],
            'name' => ['nullable', 'string', 'max:255'],
            'current_password' => ['required', 'string'],
        ]);

        if (! Hash::check($validated['current_password'], $admin->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Current password is incorrect.'],
            ]);
        }

        $oldEmail = $admin->email;

        $admin->update([
            'email' => Str::lower($validated['email']),
            'name' => $validated['name'] ?: $admin->name,
        ]);

        AuditLog::create([
            'department_id' => $admin->department_id,
            'actor' => $oldEmail,
            'action' => 'admin.transferred',
            'details' => "Department admin account transferred from {$oldEmail} to {$admin->email}.",
            'ip_address' => $request->ip(),
            'occurred_at' => now(),
        ]);

        return response()->json([
            'message' => 'Admin account transferred.',
            'user' => $this->adminPayload($admin->fresh('department')),
        ]);
    }

    public function changeVoterPassword(Request $request): JsonResponse
    {
        $token = $this->requireToken($request, 'voter');
        $voter = Voter::findOrFail($token->actor_id);

        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if (! Hash::check($validated['current_password'], $voter->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Current password is incorrect.'],
            ]);
        }

        $voter->update(['password' => $validated['password']]);

        AuditLog::create([
            'department_id' => $voter->department_id,
            'actor' => $voter->student_number,
            'action' => 'voter.password_changed',
            'details' => "Password changed for voter {$voter->student_number}.",
            'ip_address' => $request->ip(),
            'occurred_at' => now(),
        ]);

        return response()->json(['message' => 'Password changed.']);
    }

    public function surveys(Request $request): JsonResponse
    {
        $token = $this->requireToken($request);
        $surveys = Survey::with(['department', 'election', 'questions'])
            ->withCount('responses')
            ->when($token->actor_type === 'admin', function ($query) use ($token) {
                $admin = User::findOrFail($token->actor_id);
                $query->where('department_id', $admin->department_id);
            })
            ->when($token->actor_type === 'voter', function ($query) use ($token) {
                $voter = Voter::findOrFail($token->actor_id);
                $query->where('published', $this->databaseBoolean(true))
                    ->where(function ($visible) use ($voter) {
                        $visible->where('department_id', $voter->department_id)
                            ->orWhereHas('department', fn ($department) => $department->where('code', 'SSC'));
                    });
            })
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Survey $survey) => $this->surveyPayload($survey));

        return response()->json($surveys);
    }

    public function createSurvey(Request $request): JsonResponse
    {
        $admin = $this->currentAdmin($request);
        $validated = $request->validate($this->surveyRules());

        $survey = DB::transaction(function () use ($validated, $request, $admin) {
            $survey = Survey::create([
                'department_id' => $admin->department_id,
                'election_id' => null,
                'public_id' => Str::slug($validated['title']).'-'.Str::lower(Str::random(6)),
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'published' => $this->databaseBoolean($validated['published'] ?? false),
                'active' => $this->databaseBoolean($validated['active'] ?? true),
            ]);

            $this->syncSurveyQuestions($survey, $validated['questions'] ?? []);

            AuditLog::create([
                'department_id' => $admin->department_id,
                'actor' => 'admin',
                'action' => 'survey.created',
                'details' => "Created survey {$survey->title}.",
                'ip_address' => $request->ip(),
                'occurred_at' => now(),
            ]);

            return $survey;
        });

        $survey->refresh()->load(['election', 'questions'])->loadCount('responses');

        return response()->json($this->surveyPayload($survey), 201);
    }

    public function updateSurvey(Request $request, string $publicId): JsonResponse
    {
        $admin = $this->currentAdmin($request);
        $survey = Survey::with(['election', 'questions'])
            ->where('public_id', $publicId)
            ->firstOrFail();
        $this->assertAdminCanAccessDepartment($admin, $survey->department_id);

        $validated = $request->validate($this->surveyRules());
        $hasResponses = SurveyResponse::where('survey_id', $survey->id)->exists();

        DB::transaction(function () use ($survey, $validated, $hasResponses, $request) {
            $survey->update([
                'election_id' => null,
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'published' => $this->databaseBoolean($validated['published'] ?? false),
                'active' => $this->databaseBoolean($validated['active'] ?? true),
            ]);

            if (! $hasResponses) {
                $this->syncSurveyQuestions($survey, $validated['questions'] ?? []);
            }

            AuditLog::create([
                'department_id' => $survey->department_id,
                'actor' => 'admin',
                'action' => 'survey.updated',
                'details' => "Updated survey {$survey->title}.",
                'ip_address' => $request->ip(),
                'occurred_at' => now(),
            ]);
        });

        $survey->refresh()->load(['election', 'questions'])->loadCount('responses');

        return response()->json($this->surveyPayload($survey));
    }

    public function deleteSurvey(Request $request, string $publicId): JsonResponse
    {
        $admin = $this->currentAdmin($request);
        $survey = Survey::with('election')
            ->where('public_id', $publicId)
            ->firstOrFail();
        $this->assertAdminCanAccessDepartment($admin, $survey->department_id);

        if (SurveyResponse::where('survey_id', $survey->id)->exists()) {
            throw ValidationException::withMessages([
                'survey' => ['This survey already has responses and cannot be deleted.'],
            ]);
        }

        $title = $survey->title;
        $departmentId = $survey->department_id;
        $survey->delete();

        AuditLog::create([
            'department_id' => $departmentId,
            'actor' => 'admin',
            'action' => 'survey.deleted',
            'details' => "Deleted survey {$title}.",
            'ip_address' => $request->ip(),
            'occurred_at' => now(),
        ]);

        return response()->json(['message' => 'Survey deleted.']);
    }

    public function submitSurveyResponse(Request $request, string $publicId): JsonResponse
    {
        $survey = Survey::with('questions')
            ->where('public_id', $publicId)
            ->firstOrFail();

        if (! $survey->published || ! $survey->active) {
            throw ValidationException::withMessages([
                'survey' => ['This survey is not accepting responses.'],
            ]);
        }

        $validated = $request->validate([
            'answers' => ['required', 'array'],
            'anonymous' => ['nullable', 'boolean'],
        ]);

        $answers = $validated['answers'];
        $anonymous = $validated['anonymous'] ?? true;

        foreach ($survey->questions as $question) {
            if ($question->required && ! array_key_exists($question->id, $answers)) {
                throw ValidationException::withMessages([
                    'answers' => ["Missing answer for: {$question->text}"],
                ]);
            }
        }

        $token = $this->requireToken($request, 'voter');
        $voter = Voter::findOrFail($token->actor_id);

        if (! $this->voterCanAccessDepartment($voter, $survey->department_id)) {
            abort(403, 'This survey is not available to your department.');
        }

        if (SurveyResponse::where('survey_id', $survey->id)->where('voter_id', $voter->id)->exists()) {
            throw ValidationException::withMessages([
                'survey' => ['You have already submitted a response for this survey.'],
            ]);
        }

        $response = DB::transaction(function () use ($survey, $answers, $voter, $anonymous, $request) {
            $response = SurveyResponse::create([
                'survey_id' => $survey->id,
                'voter_id' => $voter->id,
                'anonymous' => $this->databaseBoolean($anonymous),
                'anonymous_token' => 'SR-'.Str::upper(Str::random(12)),
                'submitted_at' => now(),
            ]);

            foreach ($survey->questions as $question) {
                if (! array_key_exists($question->id, $answers)) {
                    continue;
                }

                $answer = $answers[$question->id];

                if (is_int($answer) && is_array($question->options)) {
                    $answer = $question->options[$answer] ?? (string) $answer;
                }

                SurveyAnswer::create([
                    'survey_response_id' => $response->id,
                    'survey_question_id' => $question->id,
                    'answer' => is_scalar($answer) ? (string) $answer : json_encode($answer),
                ]);
            }

            AuditLog::create([
                'department_id' => $survey->department_id,
                'actor' => $anonymous ? 'anonymous voter' : $voter->student_number,
                'action' => 'survey.response_submitted',
                'details' => "Response submitted for {$survey->title}.",
                'ip_address' => $request->ip(),
                'occurred_at' => now(),
            ]);

            return $response;
        });

        return response()->json([
            'message' => 'Survey response recorded.',
            'response_id' => $response->anonymous_token,
        ], 201);
    }

    public function surveyResponses(Request $request, string $publicId): JsonResponse
    {
        $admin = $this->currentAdmin($request);
        $survey = Survey::with('questions')
            ->where('public_id', $publicId)
            ->firstOrFail();
        $this->assertAdminCanAccessDepartment($admin, $survey->department_id);

        $responses = SurveyResponse::with(['voter', 'answers.question'])
            ->where('survey_id', $survey->id)
            ->latest('submitted_at')
            ->get()
            ->map(function (SurveyResponse $response) use ($survey) {
                $answersByQuestion = $response->answers->keyBy('survey_question_id');

                return [
                    'id' => $response->anonymous_token,
                    'submitted_at' => $response->submitted_at?->toIso8601String(),
                    'student_number' => $response->anonymous ? null : $response->voter?->student_number,
                    'anonymous' => (bool) $response->anonymous,
                    'answers' => $survey->questions->map(fn (SurveyQuestion $question) => [
                        'question_id' => $question->id,
                        'question' => $question->text,
                        'answer' => $answersByQuestion->get($question->id)?->answer,
                    ])->values(),
                ];
            });

        return response()->json([
            'survey' => [
                'id' => $survey->public_id,
                'title' => $survey->title,
            ],
            'questions' => $survey->questions->map(fn (SurveyQuestion $question) => [
                'id' => $question->id,
                'text' => $question->text,
                'type' => $question->type,
            ])->values(),
            'responses' => $responses,
        ]);
    }

    public function results(Request $request, string $publicId): JsonResponse
    {
        $token = $this->requireToken($request, 'voter');
        $election = Election::with(['positions.candidates'])
            ->where('public_id', $publicId)
            ->whereNull('archived_at')
            ->firstOrFail();
        $this->assertTokenCanAccessElection($token, $election);

        if (! $election->results_published) {
            abort(403, 'Results have not been published yet.');
        }

        return response()->json($this->resultsPayload($election));
    }

    public function adminResults(string $publicId): JsonResponse
    {
        $admin = $this->currentAdmin(request());
        $election = Election::with(['positions.candidates'])
            ->where('public_id', $publicId)
            ->firstOrFail();
        $this->assertAdminCanAccessDepartment($admin, $election->department_id);

        return response()->json($this->resultsPayload($election));
    }

    private function resultsPayload(Election $election): array
    {
        $totals = VoteSelection::query()
            ->select('candidate_id', DB::raw('count(*) as votes'))
            ->whereHas('vote', fn ($query) => $query->where('election_id', $election->id))
            ->groupBy('candidate_id')
            ->pluck('votes', 'candidate_id');

        return [
            'election_id' => $election->public_id,
            'published' => $election->results_published,
            'total_votes' => $election->votes()->count(),
            'positions' => $election->positions->map(function ($position) use ($totals) {
                $candidates = $position->candidates->map(function (Candidate $candidate) use ($totals) {
                    $votes = (int) ($totals[$candidate->id] ?? 0);

                    return [
                        'id' => $candidate->id,
                        'name' => $candidate->name,
                        'section' => $candidate->section,
                        'votes' => $votes,
                    ];
                })->sortByDesc('votes')->values();

                $positionTotal = $candidates->sum('votes');

                return [
                    'id' => $position->id,
                    'slug' => $position->slug,
                    'name' => $position->name,
                    'total_votes' => $positionTotal,
                    'winner' => $candidates->first()['name'] ?? null,
                    'candidates' => $candidates->map(fn ($candidate) => $candidate + [
                        'pct' => $positionTotal > 0 ? round(($candidate['votes'] / $positionTotal) * 100) : 0,
                    ])->values(),
                ];
            })->values(),
        ];
    }

    public function voteEligibility(Request $request, string $publicId): JsonResponse
    {
        $token = $this->requireToken($request, 'voter');
        $election = Election::where('public_id', $publicId)->firstOrFail();
        $voter = Voter::findOrFail($token->actor_id);
        $reasons = [];

        if ($voter->registration_status !== 'approved') {
            $reasons[] = "Account is {$voter->registration_status}. Admin approval is required.";
        }

        if ($election->status !== 'open') {
            $reasons[] = $election->status === 'upcoming' ? 'Voting has not opened yet.' : 'Election is closed.';
        }

        if ($election->archived_at !== null) {
            $reasons[] = 'This election has been archived.';
        }

        if (! $this->voterCanAccessElection($voter, $election)) {
            $reasons[] = 'This voter is not assigned to the election department.';
        }

        if (Vote::where('election_id', $election->id)->where('voter_id', $voter->id)->exists()) {
            $reasons[] = 'This voter has already voted in this election.';
        }

        return response()->json([
            'eligible' => count($reasons) === 0,
            'reasons' => $reasons,
        ]);
    }

    public function voterVotingStatus(Request $request): JsonResponse
    {
        $token = $this->requireToken($request, 'voter');
        $voter = Voter::findOrFail($token->actor_id);

        $elections = Election::with('department')
            ->withExists(['votes as has_voted' => fn ($query) => $query->where('voter_id', $voter->id)])
            ->whereNull('archived_at')
            ->where(function ($query) use ($voter) {
                $query->where('department_id', $voter->department_id)
                    ->orWhereHas('department', fn ($department) => $department->where('code', 'SSC'));
            })
            ->orderByDesc('starts_at')
            ->get()
            ->map(fn (Election $election) => [
                'id' => $election->public_id,
                'title' => $election->title,
                'department' => $election->department?->code,
                'status' => $election->status,
                'has_voted' => (bool) $election->has_voted,
            ]);

        return response()->json($elections);
    }

    public function castVote(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'election_id' => ['required', 'string'],
            'face_verified' => ['accepted'],
            'face_descriptor' => ['required', 'array', 'size:128'],
            'face_descriptor.*' => ['required', 'numeric'],
            'selections' => ['required', 'array'],
            'selections.*' => ['integer', 'exists:candidates,id'],
        ]);

        $token = $this->requireToken($request, 'voter');
        $election = Election::with(['department', 'positions.candidates'])
            ->where('public_id', $validated['election_id'])
            ->firstOrFail();

        $voter = Voter::findOrFail($token->actor_id);

        if (! $this->voterCanAccessElection($voter, $election)) {
            throw ValidationException::withMessages([
                'student_number' => ['This voter is not assigned to the election department.'],
            ]);
        }

        if ($voter->registration_status !== 'approved') {
            throw ValidationException::withMessages([
                'student_number' => ['Only approved voters can cast a ballot.'],
            ]);
        }

        if (! $voter->face_descriptor) {
            throw ValidationException::withMessages([
                'face_descriptor' => ['This account does not have a stored face descriptor. Please register again or contact an admin.'],
            ]);
        }

        if (! $this->faceDescriptorsMatch($voter->face_descriptor, $validated['face_descriptor'])) {
            throw ValidationException::withMessages([
                'face_descriptor' => ['Face verification did not match the registered face.'],
            ]);
        }

        if ($election->status !== 'open') {
            throw ValidationException::withMessages([
                'election_id' => ['This election is not open for voting.'],
            ]);
        }

        if ($election->archived_at !== null) {
            throw ValidationException::withMessages([
                'election_id' => ['This election has been archived.'],
            ]);
        }

        if (Vote::where('election_id', $election->id)->where('voter_id', $voter->id)->exists()) {
            throw ValidationException::withMessages([
                'student_number' => ['This voter has already voted in this election.'],
            ]);
        }

        $positions = $election->positions;

        if ($positions->isEmpty()) {
            throw ValidationException::withMessages([
                'selections' => ['This election does not have ballot positions yet.'],
            ]);
        }

        $positionSlugs = $positions->pluck('slug')->all();
        $extraSelections = array_diff(array_keys($validated['selections']), $positionSlugs);

        if (! empty($extraSelections)) {
            throw ValidationException::withMessages([
                'selections' => ['Ballot contains selections for unknown positions.'],
            ]);
        }

        $candidateIdsByPosition = Candidate::whereIn('position_id', $positions->pluck('id'))
            ->pluck('position_id', 'id');

        foreach ($positions as $position) {
            if (! isset($validated['selections'][$position->slug])) {
                throw ValidationException::withMessages([
                    'selections' => ["Missing selection for {$position->name}."],
                ]);
            }

            $candidateId = (int) $validated['selections'][$position->slug];

            if ((int) ($candidateIdsByPosition[$candidateId] ?? 0) !== $position->id) {
                throw ValidationException::withMessages([
                    'selections' => ["Invalid candidate selected for {$position->name}."],
                ]);
            }
        }

        $vote = DB::transaction(function () use ($election, $voter, $positions, $validated, $request) {
            $vote = Vote::create([
                'election_id' => $election->id,
                'voter_id' => $voter->id,
                'receipt_id' => 'VT-'.Str::upper(Str::random(8)),
                'face_verified' => $this->databaseBoolean(true),
                'submitted_at' => now(),
            ]);

            foreach ($positions as $position) {
                VoteSelection::create([
                    'vote_id' => $vote->id,
                    'position_id' => $position->id,
                    'candidate_id' => (int) $validated['selections'][$position->slug],
                ]);
            }

            AuditLog::create([
                'department_id' => $election->department_id,
                'actor' => $voter->student_number,
                'action' => 'vote.cast',
                'details' => "Anonymous ballot submitted for {$election->title}.",
                'ip_address' => $request->ip(),
                'occurred_at' => now(),
            ]);

            return $vote;
        });

        return response()->json([
            'message' => 'Vote recorded.',
            'receipt_id' => $vote->receipt_id,
        ], 201);
    }

    public function auditLogs(Request $request): JsonResponse
    {
        $admin = $this->currentAdmin($request);
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'actor' => ['nullable', 'string', 'max:120'],
            'action' => ['nullable', 'string', 'max:120'],
            'department' => ['nullable', 'string', 'max:40'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:10', 'max:100'],
        ]);

        $query = AuditLog::with('department')
            ->where('department_id', $admin->department_id)
            ->latest('occurred_at');

        if (! empty($validated['search'])) {
            $search = '%'.Str::lower(trim($validated['search'])).'%';
            $query->where(function ($inner) use ($search) {
                $inner->whereRaw('LOWER(COALESCE(actor, \'\')) LIKE ?', [$search])
                    ->orWhereRaw('LOWER(COALESCE(action, \'\')) LIKE ?', [$search])
                    ->orWhereRaw('LOWER(COALESCE(details, \'\')) LIKE ?', [$search]);
            });
        }

        if (! empty($validated['actor'])) {
            $actor = '%'.Str::lower(trim($validated['actor'])).'%';
            $query->whereRaw('LOWER(COALESCE(actor, \'\')) LIKE ?', [$actor]);
        }

        if (! empty($validated['action'])) {
            $query->where('action', $validated['action']);
        }

        if (! empty($validated['department'])) {
            $query->whereHas('department', fn ($department) => $department->where('code', $validated['department']));
        }

        if (! empty($validated['date_from'])) {
            $query->whereDate('occurred_at', '>=', $validated['date_from']);
        }

        if (! empty($validated['date_to'])) {
            $query->whereDate('occurred_at', '<=', $validated['date_to']);
        }

        $logs = $query
            ->paginate($validated['per_page'] ?? 25, ['*'], 'page', $validated['page'] ?? 1)
            ->through(fn (AuditLog $log) => [
                'id' => $log->id,
                'department' => $log->department?->code,
                'actor' => $log->actor,
                'action' => $log->action,
                'details' => $log->details,
                'ip_address' => $log->ip_address,
                'occurred_at' => $log->occurred_at?->toIso8601String(),
            ]);

        return response()->json([
            'data' => $logs->items(),
            'current_page' => $logs->currentPage(),
            'last_page' => $logs->lastPage(),
            'per_page' => $logs->perPage(),
            'total' => $logs->total(),
            'from' => $logs->firstItem(),
            'to' => $logs->lastItem(),
        ]);
    }

    private function electionPayload(Election $election, bool $includePositions = false): array
    {
        $approvedVoters = $this->eligibleVoterCount($election);

        $payload = [
            'id' => $election->public_id,
            'title' => $election->title,
            'department' => $election->department->code,
            'status' => $election->status,
            'starts_at' => $election->starts_at?->toIso8601String(),
            'ends_at' => $election->ends_at?->toIso8601String(),
            'total_voters' => $approvedVoters,
            'voted' => $election->votes()->count(),
            'positions' => $election->positions->count(),
            'candidates' => $election->positions->sum(fn ($position) => $position->candidates->count()),
            'description' => $election->description,
            'results_published' => $election->results_published,
            'archived' => $election->archived_at !== null,
            'archived_at' => $election->archived_at?->toIso8601String(),
        ];

        if ($includePositions) {
            $payload['ballot'] = $election->positions->map(fn ($position) => [
                'id' => $position->id,
                'slug' => $position->slug,
                'name' => $position->name,
                'candidates' => $position->candidates->map(fn ($candidate) => [
                    'id' => $candidate->id,
                    'name' => $candidate->name,
                    'year_level' => $candidate->year_level,
                    'section' => $candidate->section,
                    'platform' => $candidate->platform,
                    'photo_url' => $candidate->photo_url,
                ])->values(),
            ])->values();
        }

        return $payload;
    }

    private function candidatePayload(Candidate $candidate): array
    {
        return [
            'id' => $candidate->id,
            'name' => $candidate->name,
            'year_level' => $candidate->year_level,
            'section' => $candidate->section,
            'platform' => $candidate->platform,
            'photo_url' => $candidate->photo_url,
        ];
    }

    private function candidatePositionsPayload(Election $election)
    {
        return $election->positions->map(fn ($position) => [
            'id' => $position->id,
            'slug' => $position->slug,
            'name' => $position->name,
            'candidates' => $position->candidates->map(fn ($candidate) => $this->candidatePayload($candidate))->values(),
        ])->values();
    }

    private function voterPayload(Voter $voter, ?OfficialStudent $officialStudent = null, ?bool $voted = null): array
    {
        return [
            'id' => $voter->id,
            'student_number' => $voter->student_number,
            'first_name' => $voter->first_name,
            'middle_name' => $voter->middle_name,
            'last_name' => $voter->last_name,
            'department' => $voter->department?->code,
            'year_level' => $voter->year_level,
            'section' => $voter->section,
            'email' => $voter->email,
            'registration_status' => $voter->registration_status,
            'face_registered' => (bool) $voter->face_registered_at,
            'voted' => $voted ?? $voter->votes()->exists(),
            'official_match' => $this->officialStudentMatch($voter, $officialStudent),
        ];
    }

    private function officialStudentMatch(Voter $voter, ?OfficialStudent $officialStudent): array
    {
        if (! $officialStudent) {
            return [
                'status' => 'not_found',
                'label' => 'Not found',
                'mismatches' => ['student_number'],
                'official' => null,
            ];
        }

        $mismatches = [];
        $warnings = [];

        if ($this->normalizePersonName($voter->first_name) !== $this->normalizePersonName($officialStudent->first_name)) {
            $mismatches[] = 'first_name';
        }

        if ($this->normalizePersonName($voter->last_name) !== $this->normalizePersonName($officialStudent->last_name)) {
            $mismatches[] = 'last_name';
        }

        if ($voter->middle_name && $officialStudent->middle_name
            && $this->normalizePersonName($voter->middle_name) !== $this->normalizePersonName($officialStudent->middle_name)) {
            $warnings[] = 'middle_name';
        }

        if ($this->normalizeDepartmentValue($voter->department?->code) !== $this->normalizeDepartmentValue($officialStudent->department?->code)) {
            $mismatches[] = 'department';
        }

        if ($this->normalizeYearLevel($voter->year_level) !== $this->normalizeYearLevel($officialStudent->year_level)) {
            $warnings[] = 'year_level';
        }

        if ($this->normalizeCodeValue($voter->section) !== $this->normalizeCodeValue($officialStudent->section)) {
            $warnings[] = 'section';
        }

        if ($officialStudent->email && $voter->email
            && $this->normalizeEmailValue($voter->email) !== $this->normalizeEmailValue($officialStudent->email)) {
            $warnings[] = 'email';
        }

        return [
            'status' => empty($mismatches) ? 'matched' : 'mismatch',
            'label' => empty($mismatches) ? (empty($warnings) ? 'Matched' : 'Matched with notes') : 'Mismatch',
            'mismatches' => $mismatches,
            'warnings' => $warnings,
            'official' => [
                'student_number' => $officialStudent->student_number,
                'first_name' => $officialStudent->first_name,
                'middle_name' => $officialStudent->middle_name,
                'last_name' => $officialStudent->last_name,
                'department' => $officialStudent->department?->code,
                'year_level' => $officialStudent->year_level,
                'section' => $officialStudent->section,
                'email' => $officialStudent->email,
            ],
        ];
    }

    private function officialStudentPayload(OfficialStudent $student): array
    {
        return [
            'id' => $student->id,
            'student_number' => $student->student_number,
            'first_name' => $student->first_name,
            'middle_name' => $student->middle_name,
            'last_name' => $student->last_name,
            'department' => $student->department?->code,
            'year_level' => $student->year_level,
            'section' => $student->section,
            'email' => $student->email,
            'imported_at' => $student->imported_at?->toIso8601String(),
        ];
    }

    private function normalizePersonName(?string $value): string
    {
        return Str::lower(preg_replace('/\s+/', ' ', trim((string) $value)));
    }

    private function normalizeCodeValue(?string $value): string
    {
        return Str::upper(preg_replace('/[^a-z0-9]/i', '', (string) $value));
    }

    private function normalizeDepartmentValue(?string $value): string
    {
        $normalized = $this->normalizeCodeValue($value);

        return match ($normalized) {
            'SUPREMESTUDENTCOUNCIL', 'SSCDEPARTMENT' => 'SSC',
            'COLLEGEOFLIBERALARTS', 'LIBERALARTS', 'CLADEPARTMENT' => 'CLA',
            'COLLEGEOFEDUCATION', 'EDUCATION', 'COED', 'COEDDEPARTMENT', 'CEDDEPARTMENT' => 'CED',
            'COLLEGEOFHOSPITALITYMANAGEMENT', 'HOSPITALITYMANAGEMENT', 'COLLEGEOFTOURISMANDHOSPITALITYMANAGEMENT', 'TOURISMANDHOSPITALITYMANAGEMENT', 'CTHM', 'CTHMDEPARTMENT', 'CHMDEPARTMENT' => 'CHM',
            'COLLEGEOFCOMPUTERSTUDIES', 'COMPUTERSTUDIES', 'BSCS', 'CCSDEPARTMENT' => 'CCS',
            'COLLEGEOFBUSINESSANDACCOUNTANCY', 'BUSINESSANDACCOUNTANCY', 'COLLEGEOFBUSINESSANDMANAGEMENT', 'BUSINESSMANAGEMENT', 'CBM', 'CBMDEPARTMENT', 'CBADEPARTMENT' => 'CBA',
            'COLLEGEOFCRIMINALJUSTICEEDUCATION', 'CRIMINALJUSTICEEDUCATION', 'CCJEDEPARTMENT' => 'CCJE',
            default => $normalized,
        };
    }

    private function normalizeYearLevel(?string $value): string
    {
        return $this->canonicalYearLevel($value) ?? Str::lower(trim((string) $value));
    }

    private function canonicalYearLevel(?string $value): ?string
    {
        $normalized = preg_replace('/[^a-z0-9]/', '', Str::lower(trim((string) $value)));

        return match ($normalized) {
            '1', '1st', 'first', '1styear', 'firstyear' => '1st Year',
            '2', '2nd', 'second', '2ndyear', 'secondyear' => '2nd Year',
            '3', '3rd', 'third', '3rdyear', 'thirdyear' => '3rd Year',
            '4', '4th', 'fourth', '4thyear', 'fourthyear' => '4th Year',
            default => null,
        };
    }

    private function normalizeEmailValue(?string $value): string
    {
        return Str::lower(trim((string) $value));
    }

    private function canonicalSectionCode(?string $value): ?string
    {
        $normalized = Str::upper(preg_replace('/\s+/', '', trim((string) $value)));

        return preg_match('/^[A-Z]{2,12}-[1-4][A-Z]$/', $normalized) ? $normalized : null;
    }

    private function databaseBoolean(bool $value): mixed
    {
        if (config('database.default') === 'pgsql') {
            return DB::raw($value ? 'true' : 'false');
        }

        return $value;
    }

    private function isSscDepartment(Department $department): bool
    {
        return $this->normalizeDepartmentValue($department->code) === 'SSC';
    }

    private function isSscElection(Election $election): bool
    {
        $election->loadMissing('department');

        return $election->department && $this->isSscDepartment($election->department);
    }

    private function voterCanAccessElection(Voter $voter, Election $election): bool
    {
        return $this->isSscElection($election) || $voter->department_id === $election->department_id;
    }

    private function voterCanAccessDepartment(Voter $voter, ?int $departmentId): bool
    {
        if (! $departmentId) {
            return false;
        }

        $department = Department::find($departmentId);

        return $voter->department_id === $departmentId || ($department && $this->isSscDepartment($department));
    }

    private function assertTokenCanAccessElection(ApiToken $token, Election $election): void
    {
        if ($token->actor_type === 'admin') {
            $admin = User::findOrFail($token->actor_id);
            $this->assertAdminCanAccessDepartment($admin, $election->department_id);

            return;
        }

        $voter = Voter::findOrFail($token->actor_id);
        if (! $this->voterCanAccessElection($voter, $election)) {
            abort(403, 'This election is not available to your department.');
        }
    }

    private function eligibleVoterCount(Election $election): int
    {
        $query = Voter::where('registration_status', 'approved');

        if (! $this->isSscElection($election)) {
            $query->where('department_id', $election->department_id);
        }

        return $query->count();
    }

    private function faceDescriptorsMatch(string $stored, array $current): bool
    {
        $storedDescriptor = json_decode($stored, true);

        if (! is_array($storedDescriptor) || count($storedDescriptor) !== 128 || count($current) !== 128) {
            return false;
        }

        $sum = 0.0;

        for ($index = 0; $index < 128; $index++) {
            $difference = (float) $storedDescriptor[$index] - (float) $current[$index];
            $sum += $difference * $difference;
        }

        return sqrt($sum) <= 0.6;
    }

    private function decodeImageData(string $imageData): array
    {
        if (! preg_match('/^data:image\/(png|jpe?g|webp);base64,/', $imageData, $matches)) {
            throw ValidationException::withMessages([
                'image_data' => ['Upload a PNG, JPG, or WEBP image.'],
            ]);
        }

        $base64 = substr($imageData, strpos($imageData, ',') + 1);
        $binary = base64_decode($base64, true);

        if ($binary === false) {
            throw ValidationException::withMessages([
                'image_data' => ['The image could not be decoded.'],
            ]);
        }

        if (@getimagesizefromstring($binary) === false) {
            throw ValidationException::withMessages([
                'image_data' => ['The uploaded file is not a valid image.'],
            ]);
        }

        $extension = $matches[1] === 'jpeg' ? 'jpg' : $matches[1];

        return [$extension, $binary];
    }

    private function departmentFromInput(string $value): Department
    {
        $code = $this->normalizeDepartmentValue($value);

        return Department::firstOrCreate(
            ['code' => $code],
            ['name' => $this->departmentNameForCode($code)],
        );
    }

    private function departmentNameForCode(string $code): string
    {
        return match ($code) {
            'SSC' => 'Supreme Student Council',
            'CLA' => 'College of Liberal Arts',
            'CED' => 'College of Education',
            'CHM' => 'College of Hospitality Management',
            'CCS' => 'College of Computer Studies',
            'CBA' => 'College of Business and Accountancy',
            'CCJE' => 'College of Criminal Justice Education',
            default => $code,
        };
    }

    private function adminPayload(User $admin): array
    {
        $admin->loadMissing('department');

        return [
            'id' => $admin->id,
            'name' => $admin->name,
            'email' => $admin->email,
            'department' => $admin->department?->code,
            'role' => 'admin',
        ];
    }

    private function currentAdmin(Request $request): User
    {
        $token = $this->requireToken($request, 'admin');

        return User::with('department')->findOrFail($token->actor_id);
    }

    private function adminCanAccessDepartment(User $admin, ?int $departmentId): bool
    {
        return $admin->department_id === $departmentId;
    }

    private function assertAdminCanAccessDepartment(User $admin, ?int $departmentId): void
    {
        if (! $this->adminCanAccessDepartment($admin, $departmentId)) {
            abort(403, 'This admin account cannot access another department.');
        }
    }

    private function issueToken(string $actorType, int $actorId): string
    {
        $plain = Str::random(64);

        ApiToken::create([
            'token_hash' => hash('sha256', $plain),
            'actor_type' => $actorType,
            'actor_id' => $actorId,
            'expires_at' => now()->addDays(7),
        ]);

        return $plain;
    }

    private function requireToken(Request $request, ?string $actorType = null): ApiToken
    {
        $header = $request->bearerToken();

        if (! $header) {
            abort(401, 'Authentication token is required.');
        }

        $query = ApiToken::where('token_hash', hash('sha256', $header))
            ->where(function ($inner) {
                $inner->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            });

        if ($actorType) {
            $query->where('actor_type', $actorType);
        }

        $token = $query->first();

        if (! $token) {
            abort(401, 'Invalid or expired authentication token.');
        }

        $token->update(['last_used_at' => now()]);

        return $token;
    }

    private function surveyPayload(Survey $survey): array
    {
        return [
            'id' => $survey->public_id,
            'title' => $survey->title,
            'description' => $survey->description,
            'published' => $survey->published,
            'active' => $survey->active,
            'response_count' => $survey->responses_count ?? $survey->responses()->count(),
            'questions' => $survey->questions->map(fn ($question) => [
                'id' => $question->id,
                'text' => $question->text,
                'type' => $question->type,
                'options' => $question->options ?? [],
                'required' => $question->required,
            ])->values(),
        ];
    }

    private function surveyRules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'published' => ['sometimes', 'boolean'],
            'active' => ['sometimes', 'boolean'],
            'questions' => ['sometimes', 'array'],
            'questions.*.text' => ['required', 'string', 'max:500'],
            'questions.*.type' => ['required', 'string', 'max:80'],
            'questions.*.options' => ['nullable', 'array'],
            'questions.*.options.*' => ['nullable', 'string', 'max:255'],
            'questions.*.required' => ['sometimes', 'boolean'],
        ];
    }

    private function syncSurveyQuestions(Survey $survey, array $questions): void
    {
        $survey->questions()->delete();

        foreach (array_values($questions) as $index => $question) {
            $type = $question['type'];
            $options = $type === 'Short text'
                ? []
                : array_values(array_filter($question['options'] ?? [], fn ($option) => trim((string) $option) !== ''));

            SurveyQuestion::create([
                'survey_id' => $survey->id,
                'text' => $question['text'],
                'type' => $type,
                'options' => $options,
                'required' => $this->databaseBoolean($question['required'] ?? false),
                'display_order' => $index + 1,
            ]);
        }
    }
}
