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
        '''  
       }
    }
    stage('Start containers') {
      steps {
        sh 'docker-compose up'
        sh 'docker-compose ps'
      }
    }
    stage('Run tests again the container') {
      steps {
        sh 'curl http://localhost:3000'
      }
    }
  }
}
