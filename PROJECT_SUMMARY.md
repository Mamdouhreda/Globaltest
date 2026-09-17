# GlobalTest — Project Summary

## 1. Project Overview

GlobalTest is a global, on-demand website testing platform.

The platform allows a user to enter a website URL and test that website from a selected geographic location. The system uses real Chromium browsers running in AWS infrastructure to determine whether the website is reachable and behaving correctly from that location.

A key feature is the ability to capture a real browser screenshot so the visitor can see what the website looks like from the selected region.

### Main objective

Build a scalable service that can:

- Test websites from different geographic locations.
- Use a real Chromium browser rather than only an HTTP request.
- Check website availability and loading behaviour.
- Capture screenshots.
- Return test results to the frontend.
- Run browser tests on demand.
- Avoid keeping browser workloads running continuously when there are no tests.
- Easily add more geographic testing regions in the future.
-when there is not testing 0 money to pay to aws so no machine or containers running so no cost

---

## 2. High-Level Architecture

The initial architecture is:

```text
                         User
                           |
                           v
                    GlobalTest Frontend
                           |
                           v
                       Go Backend
                           |
                 Select Testing Region
                           |
             +-------------+-------------+
             |             |             |
             v             v             v
            UK            US          Germany
             |             |             |
             v             v             v
        ECS/Fargate    ECS/Fargate   ECS/Fargate
             |             |             |
             v             v             v
       Go + Chromium   Go + Chromium Go + Chromium
             |             |             |
             +-------------+-------------+
                           |
                           v
                    Target Website
                           |
                           v
                 Test Result / Screenshot
                           |
                           v
                          S3
                           |
                           v
                       Frontend
```

---

## 3. Frontend

The frontend will be a web application.

Possible technologies include:

- React
- Standard HTML/CSS/JavaScript
- XHTML if required

The frontend does not need to perform the browser testing itself.

Its responsibility is to provide the user interface.

### Example user flow

```text
User enters:

https://example.com

Testing location:

Germany

        |
        v

     Start Test

        |
        v

Backend starts a browser test

        |
        v

Results displayed
```

### Frontend functionality

The frontend should eventually allow users to:

- Enter a website URL.
- Select a testing location.
- Start a test.
- See whether the website is reachable.
- See loading/test information.
- View browser errors where applicable.
- View a screenshot.
- Potentially view additional performance metrics.

The frontend can be hosted using Amazon S3, potentially behind CloudFront.

---

## 4. Backend

The backend will be written in Go.

The Go backend is the central controller for the testing system.

### Backend responsibilities

The backend will:

1. Receive a website-testing request.
2. Validate the requested URL.
3. Determine the requested geographic testing region.
4. Select the appropriate AWS region.
5. Start a browser-testing workload.
6. Run Chromium.
7. Navigate to the target website.
8. Wait for the page to load.
9. Collect test information.
10. Capture a screenshot.
11. Store the screenshot if required.
12. Return the results to the frontend.

Conceptually:

```text
Frontend
   |
   | Test URL + Region
   v
Go API
   |
   | Select AWS region
   v
ECS/Fargate
   |
   v
Go + Chromium
   |
   v
Website
   |
   +--> Test results
   |
   +--> Screenshot
```

---

## 5. Chromium Browser Testing

The browser-testing component is one of the most important parts of the platform.

The system is intended to use a real Chromium browser inside the container.

The container will contain:

```text
Browser Testing Container
|
+-- Go application
|
+-- Chromium
|
+-- Chromium dependencies
|
+-- Browser configuration
|
+-- Test/screenshot logic
```

This makes the test more representative of what a real visitor experiences than a simple HTTP request.

The browser can:

- Open the website.
- Follow redirects.
- Execute JavaScript.
- Load CSS.
- Load images.
- Render the page.
- Detect browser/network errors.
- Capture screenshots.
- Measure useful browser-side information.

---

## 6. Docker Container

The Go application and Chromium environment will be packaged into a Docker image.

The Docker image will eventually be stored in Amazon Elastic Container Registry (ECR).

Example:

```text
Source Code
    |
    v
Docker Build
    |
    v
Go + Chromium Image
    |
    v
Amazon ECR
    |
    v
ECS/Fargate
```

The same container image can be used in different AWS regions.

---

## 7. AWS ECS and Fargate

The browser workload will run using Amazon ECS with AWS Fargate.

ECS provides the container orchestration layer, while Fargate provides the serverless compute for running containers without managing EC2 servers.

The initial design is based around on-demand browser-testing tasks.

### Important concept

The system does not need to keep Chromium containers running 24/7.

When there are no tests:

```text
ECS Cluster

No running browser tasks
```

When a user requests a test:

```text
User request
     |
     v
Go Backend
     |
     v
Start Fargate Task
     |
     v
Go + Chromium
     |
     v
Run test
     |
     v
Capture screenshot
     |
     v
Return/store results
     |
     v
Task finishes
```

This avoids maintaining permanently running browser workers when they are not required.

---

## 8. Global Testing Regions

The initial deployment will use three AWS regions:

- UK
- US
- Germany

Each region will have the infrastructure necessary to run browser-testing tasks.

Conceptually:

```text
GlobalTest
   |
   +-- UK AWS Region
   |     |
   |     +-- ECS Cluster
   |     +-- Fargate Tasks
   |     +-- Chromium
   |
   +-- US AWS Region
   |     |
   |     +-- ECS Cluster
   |     +-- Fargate Tasks
   |     +-- Chromium
   |
   +-- Germany AWS Region
         |
         +-- ECS Cluster
         +-- Fargate Tasks
         +-- Chromium
```

Additional regions can be added later.

Possible future locations include:

- Japan
- Singapore
- Australia
- Canada
- Brazil
- Other AWS regions

---

## 9. Empty ECS Clusters

Terraform can create the ECS clusters in the required regions even when there are no running Fargate tasks.

An empty ECS cluster by itself is not equivalent to running a server or browser workload.

The intention is to create the infrastructure first:

```text
UK
  ECS Cluster
  No running tasks

US
  ECS Cluster
  No running tasks

Germany
  ECS Cluster
  No running tasks
```

Actual compute usage occurs when Fargate tasks are launched.

AWS pricing for the other services used by the architecture still needs to be considered, such as storage, networking, logs, load balancing, and other resources.

---

## 10. Terraform

Terraform will be used as Infrastructure as Code (IaC).

The goal is for Terraform to create and manage the AWS infrastructure consistently.

Terraform will eventually manage resources such as:

- AWS providers/regions
- VPCs
- Subnets
- Internet gateways
- NAT gateways where required
- Security groups
- ECS clusters
- ECS task definitions
- Fargate configuration
- IAM roles and policies
- ECR repositories
- CloudWatch log groups
- S3 buckets
- Other supporting infrastructure

The infrastructure should be modular so that adding a new testing region does not require duplicating large amounts of Terraform code.

---

## 11. Suggested Terraform Structure

A suitable starting structure is:

```text
terraform/
|
+-- versions.tf
+-- providers.tf
+-- variables.tf
+-- main.tf
+-- outputs.tf
|
+-- modules/
      |
      +-- ecs-region/
            |
            +-- main.tf
            +-- variables.tf
            +-- outputs.tf
```

The regional module can be reused for different AWS regions.

Conceptually:

```text
Terraform Root
      |
      +-- UK configuration
      |      |
      |      +-- ecs-region module
      |
      +-- US configuration
      |      |
      |      +-- ecs-region module
      |
      +-- Germany configuration
             |
             +-- ecs-region module
```

Later, additional regions can be added by reusing the same module.

---

## 12. Networking

Each AWS region will need appropriate networking for the Fargate tasks.

The regional infrastructure is expected to include:

```text
VPC
 |
 +-- Public/Private Subnets
 |
 +-- Internet Connectivity
 |
 +-- Security Groups
 |
 +-- ECS/Fargate
```

The exact networking design can be refined during the Terraform implementation.

A major consideration is whether Fargate tasks run in public or private subnets and how they obtain outbound Internet access.

Because the browser must access arbitrary public websites, outbound Internet connectivity is required.

---

## 13. IAM

The system will use AWS IAM roles and policies to give the ECS/Fargate tasks only the permissions they need.

For example, depending on the final design, the task may need permissions for:

- CloudWatch logging.
- Reading container images from ECR.
- Writing screenshots/results to S3.

Permissions should follow the principle of least privilege.

---

## 14. Amazon ECR

Amazon ECR will store the Docker image used by the browser-testing workload.

Example:

```text
Go Source Code
      |
      v
Docker Build
      |
      v
GlobalTest Browser Image
      |
      v
Amazon ECR
      |
      v
Fargate
```

The image should contain everything required to run the browser test.

---

## 15. Screenshots

One of the key features is website screenshots.

For example:

```text
Testing Location: Japan

URL:
https://example.com

Result:
Website reachable

Load information:
2.4 seconds

Screenshot:
[Browser screenshot]
```

The browser-testing container will capture the screenshot.

The screenshot can then be stored in Amazon S3.

Possible flow:

```text
Chromium
   |
   v
Screenshot
   |
   v
S3
   |
   v
Backend
   |
   v
Frontend
```

The final implementation can determine how long screenshots should be retained and whether they should be publicly accessible or delivered through controlled URLs.

---

## 16. Test Lifecycle

A complete test should follow a lifecycle similar to:

```text
1. User submits URL
          |
          v
2. Frontend sends request
          |
          v
3. Go backend validates request
          |
          v
4. Backend determines AWS region
          |
          v
5. Backend starts Fargate task
          |
          v
6. Fargate starts container
          |
          v
7. Go application launches Chromium
          |
          v
8. Chromium opens website
          |
          v
9. Website loads
          |
          +----> Collect results
          |
          +----> Capture screenshot
          |
          v
10. Results are returned/stored
          |
          v
11. Task finishes
          |
          v
12. Frontend displays results
```

---

## 17. Example Test

A user selects:

```text
URL:
https://example.com

Location:
Germany
```

The backend determines that the test should execute in the Germany AWS region.

The system starts:

```text
Germany ECS
      |
      v
Fargate Task
      |
      v
Go + Chromium
      |
      v
https://example.com
```

The browser performs the test and produces:

```text
Status:
Success

HTTP/navigation result:
Success

Browser:
Chromium

Screenshot:
Captured

Additional metrics:
Collected
```

The task then finishes.

---

## 18. Future Queue Architecture

As the number of tests increases, a queue-based system can be introduced.

For example:

```text
                    Go API
                      |
                      v
                 Request Queue
                      |
          +-----------+-----------+
          |           |           |
          v           v           v
         UK          US        Germany
          |           |           |
       Fargate     Fargate     Fargate
          |           |           |
       Chrome      Chrome      Chrome
```

A queue can help control concurrency and prevent a large number of requests from overwhelming the system.

The exact queue technology can be decided later.

---

## 19. Scalability

The architecture is designed so that testing capacity can grow with demand.

For example:

```text
Small usage

1 test
  |
  +--> 1 Fargate task
```

Higher usage:

```text
100 tests
   |
   +--> Multiple Fargate tasks
```

Global usage:

```text
                    Request System
                         |
              +----------+----------+
              |          |          |
              v          v          v
             UK         US       Germany
              |          |          |
          Multiple    Multiple   Multiple
          Fargate     Fargate    Fargate
           tasks       tasks      tasks
```

The platform can therefore scale browser workloads independently from the frontend.

---

## 20. Potential Future Features

Once the basic testing system works, additional features can be added.

Potential features include:

- More testing regions.
- Multiple tests running simultaneously.
- Scheduled website monitoring.
- Historical test results.
- Website uptime monitoring.
- Performance measurements.
- Screenshot comparison.
- Mobile viewport testing.
- Desktop viewport testing.
- Different browser configurations.
- JavaScript error detection.
- Failed resource detection.
- SSL/TLS checks.
- Redirect tracking.
- DNS information.
- Response-time measurements.
- Page-load measurements.
- Test history.
- User accounts.
- API access.
- Usage limits.
- Billing/subscriptions.

These should be added after the core testing workflow is stable.

---

## 21. Initial Development Phases

### Phase 1 — AWS Infrastructure

Create the basic infrastructure with Terraform:

```text
Terraform
   |
   +-- UK VPC
   +-- UK ECS Cluster
   |
   +-- US VPC
   +-- US ECS Cluster
   |
   +-- Germany VPC
   +-- Germany ECS Cluster
```

Also create:

- IAM
- ECR
- Required networking
- Security groups

No permanent browser workloads are required at this stage.

---

### Phase 2 — Browser Container

Create the Docker image:

```text
Go
+
Chromium
+
Dependencies
=
GlobalTest Browser Container
```

Test the container locally before deploying it to Fargate.

---

### Phase 3 — Fargate Test

Run a single Fargate task manually.

Example:

```text
Start task
    |
    v
Chromium
    |
    v
Open website
    |
    v
Take screenshot
    |
    v
Finish task
```

This proves that the core browser environment works.

---

### Phase 4 — Go API

Create the Go backend.

The API should be able to receive something similar to:

```text
URL:
https://example.com

Region:
Germany
```

The backend then starts the appropriate Fargate task.

---

### Phase 5 — Screenshot Storage

Add S3 storage:

```text
Fargate
   |
   v
Screenshot
   |
   v
S3
```

Return a suitable reference to the frontend.

---

### Phase 6 — Frontend

Build the user interface:

```text
URL input
+
Region selector
+
Start Test
+
Results
+
Screenshot
```

---

### Phase 7 — Queue and Scaling

Once the basic system is reliable:

```text
API
 |
 v
Queue
 |
 +--> UK
 +--> US
 +--> Germany
 +--> Japan
 +--> Other regions
```

Then introduce concurrency controls, monitoring, retries, and additional operational features.

---

## 22. Important Architecture Principle

The most important design principle is to separate the system into two parts:

### Control plane

Responsible for:

- Receiving requests.
- Selecting the testing region.
- Starting tests.
- Tracking test status.
- Returning results.

This is primarily the Go backend.

### Test execution plane

Responsible for:

- Running Chromium.
- Visiting the website.
- Executing JavaScript.
- Capturing screenshots.
- Collecting browser information.
- Finishing the task.

This is the Fargate browser container.

```text
             CONTROL PLANE
                  |
                Go API
                  |
                  v
          Select AWS Region
                  |
                  v
          Start Fargate Task
                  |
                  v
          TEST EXECUTION PLANE
                  |
             Go + Chromium
                  |
                  v
             Target Website
```

This separation makes the system easier to scale and maintain.

---

## 23. Final Project Goal

GlobalTest will ultimately be a global website testing platform where a user can say:

> "Test this website from Japan."

The platform will then:

```text
1. Receive the request
2. Select Japan
3. Start a browser-testing task in the appropriate AWS region
4. Launch Chromium
5. Open the website
6. Test the website
7. Capture a screenshot
8. Collect useful results
9. Return the results
10. Finish the browser task
```

The initial infrastructure will focus on:

```text
Terraform
   +
AWS ECS
   +
AWS Fargate
   +
Docker
   +
Go
   +
Chromium
   +
ECR
   +
S3
```

Initial regions:

```text
UK
US
Germany
```