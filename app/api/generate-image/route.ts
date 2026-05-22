import { NextRequest, NextResponse } from 'next/server'

export async function POST(
    req: NextRequest
) {
    try {

        const formData =
            await req.formData()

        const response = await fetch(
            'https://api.openai.com/v1/images/edits',
            {
                method: 'POST',
                headers: {
                    Authorization:
                        `Bearer ${process.env.OPENAI_API_KEY}`,
                },
                body: formData,
            }
        )

        const data =
            await response.json()

        console.log('OPENAI:', data)

        if (!response.ok) {

            return NextResponse.json(
                data,
                {
                    status: response.status,
                }
            )
        }

        return NextResponse.json(data)

    } catch (error) {

        console.error(error)

        return NextResponse.json(
            {
                error: 'Generate image failed',
            },
            {
                status: 500,
            }
        )
    }
}