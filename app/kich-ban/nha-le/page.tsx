import React from 'react'
import CreateCript from './CreateCript'

const page = () => {
    return (
        <>
            <h1 className="text-2xl font-heading text-primary">Kịch bản</h1>
            <p className="text-muted-foreground">Tạo ảnh đại diện cho thế giới nhà sang.</p>
            <CreateCript />
        </>
    )
}

export default page