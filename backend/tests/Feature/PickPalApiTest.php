<?php

namespace Tests\Feature;

use App\Models\Candidate;
use App\Models\Department;
use App\Models\Election;
use App\Models\OfficialStudent;
use App\Models\Position;
use App\Models\Survey;
use App\Models\SurveyQuestion;
use App\Models\User;
use App\Models\Voter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PickPalApiTest extends TestCase
{
    use RefreshDatabase;

    private Department $department;
    private Election $election;
    private Survey $survey;

    protected function setUp(): void
    {
        parent::setUp();

        $this->department = Department::create([
            'code' => 'CCS',
            'name' => 'College of Computer Studies',
        ]);

        User::create([
            'department_id' => $this->department->id,
            'name' => 'PickPal Admin',
            'email' => 'admin@pickpal.test',
            'password' => Hash::make('password'),
        ]);

        $this->election = Election::create([
            'department_id' => $this->department->id,
            'public_id' => 'real-election',
            'title' => 'Real Election',
            'description' => 'Fixture election for API tests.',
            'status' => 'open',
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addDay(),
            'results_published' => false,
        ]);

        foreach (['President', 'Vice-President'] as $index => $name) {
            $position = Position::create([
                'election_id' => $this->election->id,
                'slug' => str($name)->slug()->toString(),
                'name' => $name,
                'display_order' => $index + 1,
            ]);

            Candidate::create([
                'position_id' => $position->id,
                'name' => "{$name} Candidate",
                'year_level' => '4th Year',
                'section' => 'BSIT-4A',
                'platform' => 'Fixture platform.',
            ]);
        }

        Voter::create([
            'department_id' => $this->department->id,
            'student_number' => '123456789',
            'first_name' => 'Actual',
            'middle_name' => null,
            'last_name' => 'Voter',
            'year_level' => '4th Year',
            'section' => 'BSIT-4A',
            'email' => 'actual-voter@dct.edu.ph',
            'password' => Hash::make('password'),
            'registration_status' => 'approved',
            'face_registered_at' => now(),
            'face_descriptor' => json_encode(array_fill(0, 128, 0.1)),
        ]);

        $this->survey = Survey::create([
            'department_id' => $this->department->id,
            'election_id' => null,
            'public_id' => 'real-survey',
            'title' => 'Real Survey',
            'description' => 'Fixture survey for API tests.',
            'published' => true,
            'active' => true,
        ]);

        SurveyQuestion::create([
            'survey_id' => $this->survey->id,
            'text' => 'What should be improved?',
            'type' => 'short_text',
            'options' => [],
            'required' => false,
            'display_order' => 1,
        ]);
    }

    public function test_health_endpoint_responds_with_service_metadata(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertJson([
                'status' => 'ok',
                'service' => 'PickPal API',
            ]);
    }

    public function test_elections_endpoint_returns_database_elections(): void
    {
        $token = $this->voterToken();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/elections')
            ->assertOk()
            ->assertJsonFragment([
                'id' => 'real-election',
                'department' => 'CCS',
            ]);
    }

    public function test_surveys_endpoint_returns_database_survey_questions(): void
    {
        $token = $this->voterToken();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/surveys')
            ->assertOk()
            ->assertJsonPath('0.id', 'real-survey')
            ->assertJsonPath('0.questions.0.type', 'short_text');
    }

    public function test_admin_login_returns_api_token(): void
    {
        $this->postJson('/api/admin/login', [
            'email' => 'admin@pickpal.test',
            'password' => 'password',
        ])
            ->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email', 'role']]);
    }

    public function test_admin_can_import_official_students(): void
    {
        $token = $this->postJson('/api/admin/login', [
            'email' => 'admin@pickpal.test',
            'password' => 'password',
        ])->json('token');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/official-students/import', [
                'students' => [[
                    'student_number' => '987654321',
                    'first_name' => 'Test',
                    'middle_name' => null,
                    'last_name' => 'Voter',
                    'department' => 'CCS',
                    'year_level' => '1st Year',
                    'section' => 'BSIT-1A',
                    'email' => 'test-voter@dct.edu.ph',
                ]],
            ])
            ->assertCreated()
            ->assertJsonPath('imported_count', 1)
            ->assertJsonPath('students.0.student_number', '987654321');

        $this->assertDatabaseHas(OfficialStudent::class, [
            'student_number' => '987654321',
            'email' => 'test-voter@dct.edu.ph',
        ]);
        $this->assertDatabaseMissing(Voter::class, [
            'student_number' => '987654321',
        ]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/official-students')
            ->assertOk()
            ->assertJsonPath('0.student_number', '987654321');
    }

    public function test_voter_can_submit_survey_response(): void
    {
        $token = $this->voterToken();
        $question = $this->survey->questions()->firstOrFail();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/surveys/real-survey/responses', [
                'answers' => [$question->id => 'Actual answer'],
            ])
            ->assertCreated()
            ->assertJsonStructure(['message', 'response_id']);
    }

    public function test_voter_can_cast_vote_once(): void
    {
        $token = $this->voterToken();

        $selections = $this->election->positions()->with('candidates')->get()
            ->mapWithKeys(fn (Position $position) => [
                $position->slug => $position->candidates->first()->id,
            ])->all();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/votes', [
                'election_id' => 'real-election',
                'face_verified' => true,
                'face_descriptor' => array_fill(0, 128, 0.1),
                'selections' => $selections,
            ])
            ->assertCreated()
            ->assertJsonStructure(['message', 'receipt_id']);
    }

    public function test_voter_results_are_blocked_until_published(): void
    {
        $token = $this->voterToken();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/elections/real-election/results')
            ->assertForbidden();

        $this->election->update(['results_published' => true]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/elections/real-election/results')
            ->assertOk()
            ->assertJsonPath('published', true);
    }

    public function test_voter_candidate_and_ballot_details_are_blocked_when_election_is_closed(): void
    {
        $token = $this->voterToken();
        $this->election->update(['status' => 'closed']);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/elections/real-election/candidates')
            ->assertForbidden();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/elections/real-election')
            ->assertForbidden();
    }

    public function test_voter_profile_voting_status_hides_closed_elections(): void
    {
        $token = $this->voterToken();
        $this->election->update(['status' => 'closed']);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/voter/voting-status')
            ->assertOk()
            ->assertJsonMissing([
                'id' => 'real-election',
            ]);
    }

    public function test_admin_candidate_management_is_blocked_for_closed_elections(): void
    {
        $token = $this->adminToken();
        $this->election->update(['status' => 'closed']);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/admin/elections/real-election/candidates')
            ->assertNotFound();

        $position = $this->election->positions()->firstOrFail();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/elections/real-election/candidates', [
                'position_id' => $position->id,
                'student_number' => '123456789',
                'platform' => 'Test platform.',
            ])
            ->assertUnprocessable();
    }

    public function test_admin_results_are_blocked_until_votes_exist(): void
    {
        $token = $this->adminToken();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/admin/elections/real-election/results')
            ->assertUnprocessable();
    }

    public function test_admin_can_change_password_with_token(): void
    {
        $token = $this->postJson('/api/admin/login', [
            'email' => 'admin@pickpal.test',
            'password' => 'password',
        ])->json('token');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/admin/password', [
                'current_password' => 'password',
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ])
            ->assertOk()
            ->assertJson(['message' => 'Password changed.']);
    }

    public function test_election_and_survey_data_require_authentication(): void
    {
        $this->getJson('/api/elections')->assertUnauthorized();
        $this->getJson('/api/surveys')->assertUnauthorized();
        $this->getJson('/api/elections/real-election/results')->assertUnauthorized();
    }

    private function voterToken(): string
    {
        return $this->postJson('/api/voter/login', [
            'student_number' => '123456789',
            'password' => 'password',
        ])->json('token');
    }

    private function adminToken(): string
    {
        return $this->postJson('/api/admin/login', [
            'email' => 'admin@pickpal.test',
            'password' => 'password',
        ])->json('token');
    }
}
