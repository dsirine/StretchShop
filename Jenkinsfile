pipeline {
  agent any
  stages {
    stage('Cloning Git') {
      steps {
        git 'https://github.com/dsirine/StretchShop.git'
      }
    }
    stage('Verify tooling') {
       steps {
        sh '''
          docker version
          docker info
          docker compose version
          curl --version
          jq --version
        '''  
       }
    }
    stage ('Prune docker data'){
      steps  {
        sh 'docker system prune -a --volumes -f'
      }
    }
    stage('Start containers') {
      steps {
        sh 'docker-compose up -d --no-color'
        sh 'docker-compose ps'
      }
    }
    stage('Run tests again the container') {
      steps {
        sh 'curl http://localhost:3000/ | jq'
      }
    }
  }
  post {
    always {
      sh 'docker-compose down --remove orphans -v'
      sh 'docker-compose ps'
    }
  }
}